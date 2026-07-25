'use client';

import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, Image as ImageIcon, Play, Settings, Loader2, CheckCircle2, AlertCircle, RefreshCcw } from 'lucide-react';
import imageCompression from 'browser-image-compression';

type LogItem = {
  time: string;
  msg: string;
  type: 'info' | 'success' | 'error';
};

export default function Home() {
  const [harData, setHarData] = useState<any>(null);
  const [authUrl, setAuthUrl] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [status, setStatus] = useState<'IDLE' | 'RUNNING' | 'DONE' | 'ERROR'>('IDLE');
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isShare, setIsShare] = useState(true);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const harInputRef = useRef<HTMLInputElement>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const addLog = (msg: string, type: 'info' | 'success' | 'error' = 'info') => {
    setLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), msg, type }]);
  };

  const handleHarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setGlobalError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const json = JSON.parse(ev.target?.result as string);
        setHarData(json);
        addLog(`Đã tải file HAR: ${file.name}`, 'success');
      } catch (err) {
        setGlobalError('File HAR không hợp lệ. Vui lòng kiểm tra lại định dạng JSON.');
        addLog(`Lỗi đọc file HAR: File không hợp lệ`, 'error');
      }
    };
    reader.readAsText(file);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setGlobalError(null);
    if (e.target.files) {
      setImages(Array.from(e.target.files));
      addLog(`Đã chọn ${e.target.files.length} ảnh/video`, 'success');
    }
  };

  const processImage = async (file: File): Promise<Blob> => {
    addLog(`Đang xử lý ảnh: ${file.name}`, 'info');
    const options = {
      maxSizeMB: 0.1, // ~100KB target
      maxWidthOrHeight: 1701,
      useWebWorker: true
    };
    
    try {
      const compressedFile = await imageCompression(file, options);
      addLog(`Đã nén ${file.name} xuống ${(compressedFile.size / 1024).toFixed(1)} KB`, 'success');
      return compressedFile;
    } catch (error) {
      addLog(`Lỗi nén ảnh ${file.name}`, 'error');
      return file;
    }
  };

  const startBrutalMode = async () => {
    setGlobalError(null);
    
    if (!harData && !authUrl) {
      setGlobalError("Vui lòng tải lên file .har hoặc nhập link itopencodeparam!");
      return;
    }
    if (images.length === 0) {
      setGlobalError("Vui lòng chọn ít nhất 1 hình ảnh hoặc video để chạy!");
      return;
    }

    setStatus('RUNNING');
    addLog('BẮT ĐẦU CHẠY BRUTAL MODE...', 'info');

    // Extract token
    let authToken = "";
    if (authUrl.startsWith('http')) {
      try {
        const url = new URL(authUrl);
        authToken = url.searchParams.get('itopencodeparam') || "";
      } catch(e) {}
    } else if (authUrl.length > 20) {
      authToken = authUrl.trim();
    } else if (harData?.log?.entries) {
      const entry = harData.log.entries.find((e: any) => 
        e.request?.url?.includes('kgvn-api.mobagarena.com') &&
        e.request?.headers?.find((h: any) => h.name.toLowerCase() === 'msdk-itopencodeparam')
      );
      if (entry) {
        const header = entry.request.headers.find((h: any) => h.name.toLowerCase() === 'msdk-itopencodeparam');
        authToken = header.value;
      }
    }

    if (!authToken) {
      setGlobalError("Không thể tìm thấy Token hợp lệ từ Link hoặc File HAR.");
      setStatus('ERROR');
      return;
    }

    addLog('Đang khởi tạo phiên làm việc (getselfuserinfo)...', 'info');
    let encryption = "";
    let campRoleid = "";

    try {
      const userInfoRes = await fetch('/api/proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: 'https://kgvn-api.mobagarena.com/api/user/game/getselfuserinfo',
          method: 'POST',
          headers: {
            'msdk-itopencodeparam': authToken,
            'camp-source': 'AOV-CAMP',
            'msdk-gameid': '1137',
            'camp-authtype': 'msdk',
            'areaid': '1',
            'msdk-os': '1',
            'logicworldid': '1011',
            'aov-language': 'VN',
            'msdk-channelid': '10',
            'aov-region': '1137',
            'content-type': 'application/json'
          },
          body: JSON.stringify({})
        })
      });

      if (!userInfoRes.ok) {
        const errorData = await userInfoRes.json().catch(() => ({}));
        throw new Error(errorData.error || 'Lỗi Proxy API');
      }
      const data = await userInfoRes.json();
      
      if (data.code !== 0) {
        throw new Error(`Mã lỗi ${data.code}: ${data.msg}`);
      }

      encryption = data.data?.encryption;
      campRoleid = data.data?.role?.campRoleid;

      if (!encryption) throw new Error('API không trả về tham số encryption');
      
      addLog(`Phiên hợp lệ! Tìm thấy nhân vật: ${campRoleid}`, 'success');
    } catch (err: any) {
      setGlobalError(`Lỗi xác thực Token: ${err.message}. Token có thể đã hết hạn hoặc không hợp lệ.`);
      setStatus('ERROR');
      return;
    }

    for (let i = 0; i < images.length; i++) {
      const file = images[i];
      addLog(`--- Bắt đầu batch: ${file.name} ---`, 'info');
      
      try {
        // Helper function for Garena API via Proxy
        const callGarena = async (endpoint: string, payload: any) => {
          // Garena APIs require a fresh signature (encodeparam) for EVERY request to prevent replay attacks
          const signRes = await fetch('/api/sign', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ encryption, campRoleid })
          });
          
          if (!signRes.ok) {
            throw new Error(`Lỗi lấy chữ ký cho ${endpoint}`);
          }
          const signData = await signRes.json();
          const freshEncodeParam = signData.encodeparam;

          const res = await fetch('/api/proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              url: `https://kgvn-api.mobagarena.com${endpoint}`,
              method: 'POST',
              headers: {
                'msdk-itopencodeparam': authToken,
                'encodeparam': freshEncodeParam,
                'camp-source': 'AOV-CAMP',
                'msdk-gameid': '1137',
                'camp-authtype': 'msdk',
                'areaid': '1',
                'msdk-os': '1',
                'logicworldid': '1011',
                'aov-language': 'VN',
                'msdk-channelid': '10',
                'aov-region': '1137',
                'content-type': 'application/json',
                'user-agent': 'Mozilla/5.0 (Linux; Android 16; CPH2747 Build/BP2A.250605.015; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/149.0.7827.91 Mobile Safari/537.36',
                'sec-ch-ua': '"Not(A:Brand";v="99", "Android WebView";v="133", "Chromium";v="133"'
              },
              body: JSON.stringify(payload)
            })
          });
          if (!res.ok) throw new Error(`Proxy error ${res.status}`);
          const data = await res.json();
          if (data.code !== 0) throw new Error(data.msg || `Lỗi code ${data.code}`);
          return data.data;
        };

        // 1. createposter
        addLog('Đang khởi tạo khung tranh (createposter)...', 'info');
        const createData = await callGarena('/api/game/poster/playerimage/createposter', {});
        const pid = createData.posterId;
        addLog(`Mã khung tranh: ${pid}`, 'success');

        // Helper to extract first frame of MP4
        const extractThumbnail = (file: File): Promise<Blob> => {
          return new Promise((resolve, reject) => {
            if (!file.type.startsWith('video/')) return resolve(file);
            const video = document.createElement('video');
            video.src = URL.createObjectURL(file);
            video.muted = true;
            video.playsInline = true;
            video.onloadeddata = () => { video.currentTime = 0.1; };
            video.onseeked = () => {
              const canvas = document.createElement('canvas');
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
              canvas.getContext('2d')?.drawImage(video, 0, 0);
              canvas.toBlob((b) => b ? resolve(b) : reject(new Error('Canvas error')), 'image/png');
            };
            video.onerror = reject;
          });
        };

        const thumbBlob = await extractThumbnail(file);
        const processedBlob = await processImage(new File([thumbBlob], 'thumb.png', { type: 'image/png' }));
        // Helper to convert blob to base64
        const blobToBase64 = (blob: Blob): Promise<string> => {
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const b64 = (reader.result as string).split(',')[1];
              resolve(b64);
            };
            reader.readAsDataURL(blob);
          });
        };

        const b64Image = await blobToBase64(processedBlob);

        // Upload original file if it's a video or gif
        let originalB64: string | null = null;
        let originalExt: string | null = null;
        if (file.type === 'video/mp4' || file.name.toLowerCase().endsWith('.mp4')) {
          originalB64 = await blobToBase64(file);
          originalExt = '.mp4';
        } else if (file.type === 'image/gif' || file.name.toLowerCase().endsWith('.gif')) {
          originalB64 = await blobToBase64(file);
          originalExt = '.gif';
        }

        // 2. Upload Large & Small images to COS
        const uploadToCos = async (suffix: string, b64Data: string, contentType: string = 'image/png') => {
          const fileName = `0/1/${pid}${suffix}`;
          addLog(`Xin cấp quyền đăng tải ${fileName}...`, 'info');
          const creds = await callGarena('/api/game/poster/getcoscredential', {
            scene: 'PlayerimagePoster',
            fileName: fileName
          });
          
          addLog(`Đang tải tệp ${fileName} lên máy chủ...`, 'info');
          
          const cosRes = await fetch('/api/cos', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
              creds: creds,
              b64Data: b64Data,
              contentType: contentType
            })
          });
          
          if (!cosRes.ok) {
             const errText = await cosRes.json().catch(()=>({}));
             throw new Error(`COS upload failed: ${errText.error || 'Server Error'}`);
          }
          return creds;
        };

        const credsMain = await uploadToCos('.png', b64Image); // main image
        await uploadToCos('_large.png', b64Image); // large image - required by Garena validation
        
        if (originalB64 && originalExt) {
          addLog(`Đang tải tệp động ${originalExt}...`, 'info');
          const mimeType = originalExt === '.mp4' ? 'video/mp4' : 'image/gif';
          await uploadToCos(originalExt, originalB64, mimeType);
        }

        const picInfo = {
          bg: {
            id: "21",
            picUrl: "https://kg-camp.mobagarena.com/manage/playerimage_official/iDzT817p.png",
            source: 1, width: 1080, height: 1701, posX: 0, posY: 0
          },
          stickerList: []
        };

        // 3. savepostereditinfo
        addLog('Đang lưu thông tin khung nền...', 'info');
        await callGarena('/api/game/poster/playerimage/savepostereditinfo', { picInfo });

        // 4. saveposter
        addLog('Đang lưu thay đổi vào game (saveposter)...', 'info');
        const getCdnUrl = (creds: any) => {
          const cdnHost = creds.cdnHost || 'https://kg-camp-ugc.mobagarena.com';
          let basePath = creds.path || '';
          if (basePath.includes('/0/1/')) {
            basePath = basePath.split('/0/1/')[0] + '/';
          }
          return cdnHost.replace(/\/+$/, '') + basePath;
        };
        const picUrl = getCdnUrl(credsMain);
        
        await callGarena('/api/game/poster/playerimage/saveposter', {
          posterId: pid,
          isApply: true,
          isShare: isShare,
          picUrl: picUrl,
          picInfo: picInfo
        });

        addLog(`HOÀN TẤT ĐỔI NỀN! Bạn có thể vào game kiểm tra.`, 'success');
      } catch (err: any) {
        addLog(`Lỗi xử lý ảnh: ${err.message}`, 'error');
        setStatus('ERROR');
        return;
      }

      addLog(`Đang đợi 2s trước khi qua ảnh tiếp theo...`, 'info');
      await new Promise(r => setTimeout(r, 2000));
    }

    addLog('HOÀN THÀNH BRUTAL MODE!', 'success');
    setStatus('DONE');
  };

  return (
    <div className="min-h-screen bg-transparent text-brand-ink font-sans flex flex-col selection:bg-brand-primary/20 selection:text-brand-primary relative">
      
      {/* Ambient Enterprise Background Glows & SVG Grid */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-20%] left-[-10%] w-[70vw] h-[70vw] rounded-full bg-brand-primary/10 blur-[120px] opacity-60 mix-blend-screen"></div>
        <div className="absolute top-[40%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-brand-accent-teal/10 blur-[100px] opacity-40 mix-blend-screen"></div>
        
        {/* Enterprise SVG Grid Background */}
        <svg
          className="absolute inset-0 h-full w-full [mask-image:radial-gradient(ellipse_100%_100%_at_50%_0%,black_30%,transparent_80%)] opacity-20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern
              id="enterprise-grid"
              width="32"
              height="32"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M0 32V.5H32"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                className="text-brand-muted"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#enterprise-grid)" />
        </svg>
      </div>
      {/* HEADER */}
      <header className="bg-brand-surface-card/80 backdrop-blur-md border-b border-brand-surface-dark-soft sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-brand-primary p-2 rounded-lg ">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-heading font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-brand-ink to-brand-muted">
              AOV Loading Match
            </h1>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 flex flex-col gap-8">
        
        {/* Intro */}
        <div className="max-w-3xl">
          <h2 className="text-3xl md:text-4xl text-brand-ink font-heading font-bold tracking-tight mb-4">
            Đổi ảnh nền chờ trận <span className="text-brand-primary">tự động</span>
          </h2>
          <p className="text-lg text-brand-muted">
            Xử lý hàng loạt hình ảnh, tự động bypass hệ thống bảo mật Garena.
          </p>
        </div>

        {/* Global Error State */}
        {globalError && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg flex items-start gap-3  animate-in fade-in slide-in-from-top-2 duration-300">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-bold text-red-800 font-serif tracking-tighter">Đã xảy ra lỗi</h3>
              <p className="text-sm text-red-700 mt-1">{globalError}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* CỘT TRÁI: TƯƠNG TÁC (7 columns on large screens) */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            
            {/* STEP 1: AUTH */}
            <section className="bg-brand-surface-card p-6 md:p-8 rounded-xl  border border-brand-hairline transition-all duration-300 hover:">
              <div className="flex items-center gap-3 mb-6">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-brand-primary/20 text-brand-primary font-bold text-sm">1</span>
                <h3 className="text-lg text-brand-ink font-heading font-semibold tracking-tight">Xác thực hệ thống</h3>
              </div>
              
              <div className="space-y-5">
                <div>
                  <label htmlFor="authUrl" className="block text-sm font-medium text-brand-ink mb-1.5">
                    Mã Token (msdk-itopencodeparam) hoặc Link sự kiện
                  </label>
                  <input 
                    id="authUrl"
                    type="text" 
                    className="w-full border border-brand-hairline rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder:text-brand-muted"
                    placeholder="Dán chuỗi token 775F36C1... hoặc link https://..."
                    value={authUrl}
                    onChange={(e) => setAuthUrl(e.target.value)}
                  />
                </div>
                
                <div className="flex items-center justify-center w-full">
                  <span className="h-px bg-slate-200 flex-1"></span>
                  <span className="text-xs text-brand-muted font-medium px-4 uppercase tracking-wider">Hoặc</span>
                  <span className="h-px bg-slate-200 flex-1"></span>
                </div>
                
                <div 
                  className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 cursor-pointer group
                    ${harData ? 'border-brand-success bg-brand-success/10' : 'border-brand-hairline hover:border-brand-muted hover:bg-brand-surface-soft'}`}
                >
                  <input 
                    type="file" 
                    ref={harInputRef}
                    accept=".har"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    onChange={handleHarUpload}
                  />
                  {harData ? (
                    <CheckCircle2 className="w-10 h-10 mx-auto text-green-500 mb-3" />
                  ) : (
                    <UploadCloud className="w-10 h-10 mx-auto text-brand-muted mb-3 group-hover:text-brand-ink transition-colors" />
                  )}
                  <p className="text-sm font-medium text-brand-ink mb-1">
                    {harData ? 'Đã nhận dạng dữ liệu HAR' : 'Tải lên file Capture (.har)'}
                  </p>
                  <p className="text-xs text-brand-muted">
                    Kéo thả hoặc click để duyệt file trên thiết bị
                  </p>
                </div>
              </div>
            </section>

            {/* STEP 2: IMAGES */}
            <section className="bg-brand-surface-card p-6 md:p-8 rounded-xl  border border-brand-hairline transition-all duration-300 hover:">
              <div className="flex items-center gap-3 mb-6">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-brand-primary/20 text-brand-primary font-bold text-sm">2</span>
                <h3 className="text-lg text-brand-ink font-heading font-semibold tracking-tight">Danh sách Hình ảnh / Media</h3>
              </div>
              
              <div className="relative border-2 border-dashed border-brand-hairline rounded-xl p-8 text-center transition-all duration-200 hover:border-brand-muted hover:bg-brand-surface-soft cursor-pointer group">
                <input 
                  type="file" 
                  ref={fileInputRef}
                  multiple
                  accept="image/*,video/mp4"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  onChange={handleImageUpload}
                />
                <ImageIcon className="w-10 h-10 mx-auto text-brand-muted mb-3 group-hover:text-brand-ink transition-colors" />
                <p className="text-sm font-medium text-brand-ink mb-1">
                  Chọn ảnh (JPG, PNG, WEBP) hoặc Video (MP4)
                </p>
                <p className="text-xs text-brand-muted">
                  {images.length > 0 ? (
                    <span className="text-brand-ink font-semibold">{images.length} file đã được chọn sẵn sàng xử lý</span>
                  ) : (
                    'Hỗ trợ auto resize chuẩn 1080x1701'
                  )}
                </p>
              </div>
            </section>

            {/* TOGGLE SHARE */}
            <div className="bg-brand-surface-card p-4 rounded-xl  border border-brand-hairline flex items-center justify-between">
              <div>
                <h3 className="text-sm text-brand-ink font-heading font-semibold tracking-tight">Chế độ hiển thị</h3>
                <p className="text-xs text-brand-muted">{isShare ? 'Công khai lên Quảng trường' : 'Riêng tư (Chỉ bạn thấy)'}</p>
              </div>
              <button 
                onClick={() => setIsShare(!isShare)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isShare ? 'bg-brand-primary' : 'bg-brand-hairline'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-brand-surface-card transition-transform ${isShare ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
            
            {/* ACTION BUTTON */}
            <button 
              onClick={startBrutalMode}
              disabled={status === 'RUNNING'}
              className={`w-full py-4 px-6 rounded-xl font-bold text-lg  flex justify-center items-center gap-3 transition-all duration-300
                ${status === 'RUNNING' 
                  ? 'bg-brand-primary-disabled text-brand-muted border-none cursor-not-allowed ' 
                  : 'bg-brand-primary text-brand-on-primary hover:bg-brand-primary-active hover:-translate-y-0.5 active:translate-y-0 cursor-pointer'
                }
              `}
            >
              {status === 'RUNNING' ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin text-brand-on-primary" />
                  Đang xử lý tiến trình Brutal Mode...
                </>
              ) : (
                <>
                  <Play className="w-6 h-6" />
                  Kích hoạt hệ thống
                </>
              )}
            </button>

            {/* RETRY BUTTON (if error) */}
            {status === 'ERROR' && (
              <button 
                onClick={() => setStatus('IDLE')}
                className="w-full py-3 px-6 rounded-xl font-medium text-brand-ink bg-brand-surface-card border border-brand-hairline hover:bg-transparent transition flex justify-center items-center gap-2 cursor-pointer"
              >
                <RefreshCcw className="w-4 h-4" />
                Thử lại từ đầu
              </button>
            )}

          </div>

          {/* CỘT PHẢI: TERMINAL LOGS (5 columns on large screens) */}
          <div className="lg:col-span-5 flex flex-col h-[500px] lg:h-[calc(100vh-200px)] lg:sticky lg:top-24">
            <div className="bg-brand-surface-dark rounded-xl  overflow-hidden flex flex-col h-full border border-brand-hairline">
              
              {/* Terminal Header */}
              <div className="bg-brand-surface-dark-elevated px-4 py-3 flex justify-between items-center border-b border-brand-surface-dark-soft">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
                <h3 className="text-xs font-semibold text-brand-on-dark-soft tracking-wider uppercase font-sans">Live Output Console</h3>
                <span className="flex h-2.5 w-2.5 relative">
                  {status === 'RUNNING' && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>}
                  <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${status === 'RUNNING' ? 'bg-green-500' : 'bg-slate-600'}`}></span>
                </span>
              </div>
              
              {/* Terminal Body */}
              <div className="flex-1 p-5 overflow-y-auto font-mono text-[13px] leading-relaxed space-y-2">
                {logs.length === 0 ? (
                  <div className="text-brand-muted italic flex items-center justify-center h-full">
                    Hệ thống đang chờ lệnh...
                  </div>
                ) : (
                  logs.map((log, i) => {
                    let textColor = 'text-brand-on-dark';
                    if (log.type === 'error') textColor = 'text-brand-error';
                    if (log.type === 'success') textColor = 'text-brand-success';
                    if (log.type === 'info') textColor = 'text-brand-accent-teal';

                    return (
                      <div key={i} className="flex gap-3 animate-in fade-in slide-in-from-bottom-1">
                        <span className="text-brand-muted shrink-0 select-none">[{log.time}]</span>
                        <span className={`break-words ${textColor}`}>{log.msg}</span>
                      </div>
                    );
                  })
                )}
                <div ref={logsEndRef} />
              </div>

            </div>
          </div>

        </div>
      </main>

      {/* FOOTER - ENTERPRISE COPYRIGHT */}
      <footer className="bg-brand-surface-dark mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2 text-brand-on-dark-soft text-sm">
              <span className="font-semibold text-brand-on-dark">AOV Loading Match SaaS</span>
              <span>&copy; {new Date().getFullYear()}</span>
            </div>
            <p className="text-sm text-brand-on-dark-soft font-medium">
              Thiết kế và phát triển chuẩn Enterprise by <span className="text-brand-on-dark font-bold tracking-wide">HỒ NĂNG QUÝ</span>
            </p>
          </div>
        </div>
      </footer>

    </div>
  );
}
