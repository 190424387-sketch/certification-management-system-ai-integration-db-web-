import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Settings } from 'lucide-react';

interface ScheduleDocsSettingsPanelProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  docsSettings: {
    clientId: string;
    clientSecret: string;
    accessToken: string;
    openId: string;
    fileUrl: string;
  };
  setDocsSettings: (settings: any) => void;
  onSave: () => void;
}

export const ScheduleDocsSettingsPanel: React.FC<ScheduleDocsSettingsPanelProps> = ({
  isOpen,
  onOpenChange,
  docsSettings,
  setDocsSettings,
  onSave,
}) => {
  const host = window.location.host;
  const isDev = host.startsWith('ais-dev-');
  const isPre = host.startsWith('ais-pre-');
  
  // Provide both domains to the user if they're in AI Studio
  const devHost = host.replace('ais-pre-', 'ais-dev-');
  const previewHost = host.replace('ais-dev-', 'ais-pre-');

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger render={
        <Button variant="outline" className="bg-white border-slate-200">
          <Settings className="w-4 h-4 mr-2 text-slate-500" />
          排程表连接设置
        </Button>
      } />
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>排程表连接设置</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto px-1">
          <div className="space-y-2">
            <Label>Client ID (应用ID)</Label>
            <Input 
              value={docsSettings.clientId || ''} 
              onChange={e => setDocsSettings({...docsSettings, clientId: e.target.value})} 
            />
          </div>
          <div className="space-y-2">
            <Label>Client Secret (应用密钥 - 仅用于OAuth)</Label>
            <Input 
              type="password" 
              value={docsSettings.clientSecret || ''} 
              onChange={e => setDocsSettings({...docsSettings, clientSecret: e.target.value})} 
            />
          </div>
          <div className="space-y-2">
            <Label>推算目标 WPS 文档链接/ID</Label>
            <Input 
              placeholder="输入WPS文档分享链接或者File ID" 
              value={docsSettings.fileUrl || ''} 
              onChange={e => setDocsSettings({...docsSettings, fileUrl: e.target.value})} 
            />
          </div>
        </div>
        <div className="flex justify-end pt-2">
          <Button onClick={onSave} className="bg-brand-blue hover:bg-brand-blue/90">
            保存设置
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
