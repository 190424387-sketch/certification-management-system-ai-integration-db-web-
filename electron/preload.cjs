const { contextBridge, app } = require('electron');
const path = require('path');
const os = require('os');

function getHardwareMac() {
  try {
    // Generate a highly stable machine identifier based on physical hardware & OS properties 
    // instead of network interfaces which can change depending on VPNs, USB docks, or Wi-Fi state.
    const platform = os.platform();
    const arch = os.arch();
    const cpus = os.cpus();
    const model = cpus && cpus.length > 0 ? cpus[0].model : 'unknown-cpu';
    const totalmem = os.totalmem();
    
    // Attempt to get stable MACs from network interfaces (sorted to avoid order issues)
    // but only fallback/include them if they exist
    const interfaces = os.networkInterfaces();
    const macs = [];
    for (const name of Object.keys(interfaces)) {
      // Discard common volatile interface names (VPNs, virtual adapters)
      if (name.toLowerCase().includes('virtual') || name.toLowerCase().includes('vmware') || name.toLowerCase().includes('vbox')) continue;
      
      for (const iface of interfaces[name]) {
        if (!iface.internal && iface.mac && iface.mac !== '00:00:00:00:00:00') {
          macs.push(iface.mac);
        }
      }
    }
    macs.sort();
    
    // Combine all stable factors into a raw string
    const rawId = `${platform}-${arch}-${totalmem}-${model}-${macs.join(',')}`;
    
    // Simple 32-bit FNV-1a hash
    let hash = 2166136261;
    for (let i = 0; i < rawId.length; i++) {
      hash ^= rawId.charCodeAt(i);
      hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    
    const stableHash = (hash >>> 0).toString(16).toUpperCase().padStart(8, '0');
    return `HWID-${stableHash}`;
  } catch (e) {
    return 'UNKNOWN-MAC';
  }
}

// Expose the log file path to the renderer window so it can show where the log is
contextBridge.exposeInMainWorld('electronDebug', {
  getLogPath: () => {
    // In preload, we can't directly access 'app', but we can pre-calculate it in main or send via IPC
    return "AppData/Local/react-example/logs/runtime-debug.log"; 
  }
});

contextBridge.exposeInMainWorld('electronHardware', {
  getMacAddress: () => getHardwareMac()
});
