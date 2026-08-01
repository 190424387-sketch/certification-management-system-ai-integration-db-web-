import React, { useState, useRef, useEffect } from 'react';
import { Compass, HelpCircle, MapPin, Search, Loader2, X } from 'lucide-react';

interface ChinaMapProps {
  startLoc: string;
  setStartLoc: (loc: string) => void;
  endLoc: string;
  setEndLoc: (loc: string) => void;
  onGeneratePlan?: () => void;
  isGenerating?: boolean;
}

export default function ChinaInteractiveMap({
  startLoc,
  setStartLoc,
  endLoc,
  setEndLoc,
  onGeneratePlan,
  isGenerating = false
}: ChinaMapProps) {
  // Tianditu Integration States
  
  const [isTdtLoaded, setIsTdtLoaded] = useState<boolean>(false);
  const [tdtLoading, setTdtLoading] = useState<boolean>(true);
  const [tdtError, setTdtError] = useState<string>('');


  const [searchVal, setSearchVal] = useState('');
  
  // Floating popup state for coordinates clicked on Tianditu
  const [tdtClickPopup, setTdtClickPopup] = useState<{
    lng: number;
    lat: number;
    address: string;
  } | null>(null);

  const tdtContainerRef = useRef<HTMLDivElement>(null);
  
  // Tianditu Instance and marker references
  const tdtInstanceRef = useRef<any>(null);
  const tdtStartMarkerRef = useRef<any>(null);
  const tdtEndMarkerRef = useRef<any>(null);
  const tdtRouteLineRef = useRef<any>(null);
  const infoWinRef = useRef<any>(null);

  useEffect(() => {
    if ((window as any).T) {
      setIsTdtLoaded(true);
      setTdtLoading(false);
      return;
    }

    const scriptId = 'tdt-script';
    if (document.getElementById(scriptId)) {
      // Script already added, wait for it
      const checkT = setInterval(() => {
        if ((window as any).T) {
          setIsTdtLoaded(true);
          setTdtLoading(false);
          clearInterval(checkT);
        }
      }, 500);
      return () => clearInterval(checkT);
    }

    const key = (import.meta as any).env.VITE_TDT_KEY || "efa82ff44955c55db547cf77166d1deb";
    const script = document.createElement('script');
    script.id = scriptId;
    script.type = 'text/javascript';
    script.src = `https://api.tianditu.gov.cn/api?v=4.0&tk=${key}`;
    script.async = true;
    
    script.onload = () => {
      if ((window as any).T) {
        setIsTdtLoaded(true);
        setTdtLoading(false);
      } else {
        setTdtError('天地图脚本加载成功，但未能找到 T 对象。可能是密钥受限。');
        setTdtLoading(false);
      }
    };
    
    script.onerror = () => {
      setTdtError('天地图脚本加载失败，请检查网络或配置。');
      setTdtLoading(false);
    };
    
    document.head.appendChild(script);
  }, []);


  // Tianditu Map instance lifecycle
  useEffect(() => {
    if (!isTdtLoaded || !tdtContainerRef.current) return;

    const T = (window as any).T;
    const map = new T.Map('tdt-map-container');
    map.centerAndZoom(new T.LngLat(116.397428, 39.90923), 5); // Default Beijing center
    
    // Add controls
    map.addControl(new T.Control.Zoom());
    map.addControl(new T.Control.Scale());

    tdtInstanceRef.current = map;

    // Click event for reverse geocoding
    const handleClick = (e: any) => {
      const geocode = new T.Geocoder();
      geocode.getLocation(e.lnglat, (res: any) => {
        if (res && res.getStatus() === 0) {
          setTdtClickPopup({
            lng: e.lnglat.lng,
            lat: e.lnglat.lat,
            address: res.getAddress()
          });
        }
      });
    };
    map.addEventListener('click', handleClick);

    return () => {
      if (tdtInstanceRef.current) {
        tdtInstanceRef.current.clearOverLays();
        tdtInstanceRef.current = null;
      }
      tdtStartMarkerRef.current = null;
      tdtEndMarkerRef.current = null;
      tdtRouteLineRef.current = null;
      infoWinRef.current = null;
    };
  }, [isTdtLoaded]);

  // Geocode and update Tianditu Markers & Routes dynamically when startLoc or endLoc changes
  useEffect(() => {
    const map = tdtInstanceRef.current;
    if (!map || !isTdtLoaded) return;

    const T = (window as any).T;
    const geocoder = new T.Geocoder();

    const updateLocation = (loc: string, isStart: boolean) => {
      if (!loc) {
        if (isStart && tdtStartMarkerRef.current) {
          map.removeOverLay(tdtStartMarkerRef.current);
          tdtStartMarkerRef.current = null;
        } else if (!isStart && tdtEndMarkerRef.current) {
          map.removeOverLay(tdtEndMarkerRef.current);
          tdtEndMarkerRef.current = null;
        }
        return Promise.resolve();
      }

      return new Promise<void>((resolve) => {
        geocoder.getPoint(loc, (res: any) => {
          if (res && res.getStatus() === 0) {
            const pos = res.getLocationPoint();
            if (pos) {
              if (isStart) {
                if (tdtStartMarkerRef.current) {
                  tdtStartMarkerRef.current.setLngLat(pos);
                } else {
                  const icon = new T.Icon({
                    iconUrl: 'https://api.tianditu.gov.cn/v4.0/image/marker-icon.png',
                    iconSize: new T.Point(25, 41),
                    iconAnchor: new T.Point(12, 41)
                  });
                  tdtStartMarkerRef.current = new T.Marker(pos, { icon });
                  map.addOverLay(tdtStartMarkerRef.current);
                }
              } else {
                if (tdtEndMarkerRef.current) {
                  tdtEndMarkerRef.current.setLngLat(pos);
                } else {
                  const icon = new T.Icon({
                    iconUrl: 'https://api.tianditu.gov.cn/v4.0/image/marker-icon.png',
                    iconSize: new T.Point(25, 41),
                    iconAnchor: new T.Point(12, 41)
                  });
                  tdtEndMarkerRef.current = new T.Marker(pos, { icon });
                  map.addOverLay(tdtEndMarkerRef.current);
                }
              }
            }
          }
          resolve();
        });
      });
    };

    const syncMarkersAndRoute = async () => {
      await updateLocation(startLoc, true);
      await updateLocation(endLoc, false);

      if (tdtStartMarkerRef.current && tdtEndMarkerRef.current) {
        const p1 = tdtStartMarkerRef.current.getLngLat();
        const p2 = tdtEndMarkerRef.current.getLngLat();

        if (tdtRouteLineRef.current) {
          map.removeOverLay(tdtRouteLineRef.current);
          tdtRouteLineRef.current = null;
        }

        tdtRouteLineRef.current = new T.Polyline([p1, p2], {
          color: "#3b82f6", 
          weight: 4,
          opacity: 0.8,
          lineStyle: "dashed"
        });
        map.addOverLay(tdtRouteLineRef.current);
        
        // Fit bounds
        map.setViewport([p1, p2]);
      } else {
        if (tdtRouteLineRef.current) {
          map.removeOverLay(tdtRouteLineRef.current);
          tdtRouteLineRef.current = null;
        }
      }
    };

    syncMarkersAndRoute();
  }, [startLoc, endLoc, isTdtLoaded]);

  // Handler for address searching inside Tianditu
  const handleTdtSearch = () => {
    if (!searchVal.trim() || !tdtInstanceRef.current) return;
    
    const T = (window as any).T;
    const geocoder = new T.Geocoder();
    
    geocoder.getPoint(searchVal, (res: any) => {
      if (res && res.getStatus() === 0) {
        const pos = res.getLocationPoint();
        tdtInstanceRef.current.centerAndZoom(pos, 12);
        
        setTdtClickPopup({
          lng: pos.lng,
          lat: pos.lat,
          address: searchVal
        });
      }
    });
  };

  return (
    <div className="flex flex-col h-full min-h-[500px] bg-white rounded-3xl overflow-hidden border border-slate-200/60 shadow-xl shadow-brand-blue/5">
      
      {/* Header Area */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between p-5 lg:p-6 gap-6 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-blue/10 flex items-center justify-center shrink-0">
              <Compass className="w-5.5 h-5.5 text-brand-blue" />
            </div>
            <div>
              <h2 className="text-sm md:text-base font-black text-slate-800 tracking-tight leading-snug">全国行政大盘与商旅智绘地图</h2>
              <p className="text-[11px] text-slate-400 font-medium">
                天地图已实时载入：支持搜索、精细拖动、点击定位并智能反查地址
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Map Stage Area */}
      <div className="flex-1 min-h-0 bg-slate-50/50 relative overflow-hidden">
        
        {/* MAP MODE: Tianditu Professional Map */}
        <div className="w-full h-full relative">
          {/* Loading Indicator */}
          {tdtLoading && (
            <div className="absolute inset-0 z-30 bg-white/70 backdrop-blur-xs flex flex-col items-center justify-center gap-2.5">
              <Loader2 className="w-8 h-8 text-brand-blue animate-spin" />
              <span className="text-xs font-black text-slate-500">正在初始化天地图引擎...</span>
            </div>
          )}

          {/* Tianditu DOM container */}
          <div 
            ref={tdtContainerRef} 
            id="tdt-map-container"
            style={{ width: "100%", height: "100%", minHeight: "500px" }}
            className="w-full h-full"
          />

          
          
          {tdtError && (
            <div className="absolute inset-0 z-40 bg-white flex flex-col items-center justify-center p-6 text-center">
              <div className="w-12 h-12 bg-red-50 text-red-500 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              </div>
              <h3 className="text-sm font-bold text-slate-800 mb-1">地图加载异常</h3>
              <p className="text-xs text-slate-500 max-w-sm leading-relaxed">{tdtError}</p>
            </div>
          )}
          {isTdtLoaded && !tdtError && (

            <>
              {/* Internal Map Search Bar */}
              <div className="absolute top-4 left-4 z-20 flex items-center bg-white shadow-md rounded-xl p-1 border border-slate-200/60">
                <input 
                  type="text" 
                  placeholder="在地图中搜索地点..." 
                  className="px-3 py-2 text-xs w-48 focus:outline-none bg-transparent font-medium"
                  value={searchVal}
                  onChange={e => setSearchVal(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleTdtSearch()}
                />
                <button 
                  onClick={handleTdtSearch}
                  className="p-2 bg-brand-blue/10 text-brand-blue hover:bg-brand-blue hover:text-white rounded-lg transition-colors cursor-pointer"
                >
                  <Search className="w-4 h-4" />
                </button>
              </div>

              {/* Popup on Map Click */}
              {tdtClickPopup && (
                <div 
                  className="absolute z-20 bg-white shadow-xl rounded-2xl border border-slate-200 p-4 min-w-[280px] animate-in fade-in zoom-in-95 duration-200"
                  style={{
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)'
                  }}
                >
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-8 h-8 rounded-full bg-brand-blue/10 flex items-center justify-center shrink-0">
                      <MapPin className="w-4 h-4 text-brand-blue" />
                    </div>
                    <div className="flex-1 min-w-0 pr-6">
                      <h4 className="text-xs font-bold text-slate-400 mb-1">选定位置</h4>
                      <span className="text-xs font-black text-slate-700 block truncate max-w-[240px]">{tdtClickPopup.address}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => setTdtClickPopup(null)} 
                    className="absolute top-3 right-3 p-1 text-slate-300 hover:text-slate-500 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <div className="flex items-center gap-2">
                    <button 
                      className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 text-xs font-black py-2 rounded-xl transition-colors cursor-pointer"
                      onClick={() => {
                        setStartLoc(tdtClickPopup.address);
                        setTdtClickPopup(null);
                      }}
                    >
                      设为起点
                    </button>
                    <button 
                      className="flex-1 bg-brand-blue/10 hover:bg-brand-blue/20 text-brand-blue text-xs font-black py-2 rounded-xl transition-colors cursor-pointer"
                      onClick={() => {
                        setEndLoc(tdtClickPopup.address);
                        setTdtClickPopup(null);
                      }}
                    >
                      设为终点
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Footer Info / Instructions Panel */}
      <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0 gap-4">
        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold leading-relaxed">
          <HelpCircle className="w-4 h-4 text-slate-300 shrink-0" />
          <span>
            <b>天地图指南：支持在地图任何地点直接点选定位并一键设定为起点或终点；在左上角检索框输入任何地名精准定位；支持双击放大或滚轮无级缩放。</b>
          </span>
        </div>
      </div>
    </div>
  );
}
