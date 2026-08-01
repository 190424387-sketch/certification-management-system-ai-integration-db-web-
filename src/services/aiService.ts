import { io } from 'socket.io-client';

let socketClient: ReturnType<typeof io> | null = null;
function getSocket() {
  if (!socketClient) {
    socketClient = io();
  }
  return socketClient;
}

export interface AISettings {
  provider: 'gemini' | 'openai';
  modelName: string;
  apiKey: string;
  proxyUrl: string;
  useInternalProxy: boolean;
  isDebug: boolean;
  // Module specific temperatures
  moduleSettings: {
    search: { temperature: number };
    audit: { temperature: number };
    schedule: { temperature: number };
    plan: { temperature: number };
  };
}

const SETTINGS_KEY = 'certMatch_ai_settings_v2';
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const DEFAULT_MODULE_SETTINGS = {
  search: { temperature: 0 },
  audit: { temperature: 0.1 },
  schedule: { temperature: 0.2 },
  plan: { temperature: 0.3 },
};

export function getAISettings(): AISettings {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        provider: parsed.provider || 'gemini',
        modelName: parsed.modelName || 'gemini-3-flash-preview',
        apiKey: parsed.apiKey || 'sk-9nrtLy0eMUCfWXMxqoxhTELOivi8Q34okX2cToXl2ODvxvFb',
        proxyUrl: parsed.proxyUrl || 'https://api-slb.packyapi.com',
        useInternalProxy: parsed.useInternalProxy ?? false,
        isDebug: parsed.isDebug || false,
        moduleSettings: {
          search: parsed.moduleSettings?.search || DEFAULT_MODULE_SETTINGS.search,
          audit: parsed.moduleSettings?.audit || DEFAULT_MODULE_SETTINGS.audit,
          schedule: parsed.moduleSettings?.schedule || DEFAULT_MODULE_SETTINGS.schedule,
          plan: parsed.moduleSettings?.plan || DEFAULT_MODULE_SETTINGS.plan,
        }
      };
    }
  } catch (e) {}
  
  return {
    provider: 'gemini',
    modelName: 'gemini-3-flash-preview',
    apiKey: 'sk-9nrtLy0eMUCfWXMxqoxhTELOivi8Q34okX2cToXl2ODvxvFb',
    proxyUrl: 'https://api-slb.packyapi.com',
    useInternalProxy: false,
    isDebug: false,
    moduleSettings: DEFAULT_MODULE_SETTINGS
  };
}

export interface AIResult {
  text: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export async function callAI(prompt: string | any[], options: { model?: string, responseSchema?: any, responseMimeType?: string, systemInstruction?: string, temperature?: number, retries?: number, module?: 'search' | 'audit' | 'schedule' | 'plan', tools?: any[] } = {}): Promise<AIResult> {

  const settings = getAISettings();
  const apiKey = settings.apiKey;
  
  const effectiveTemperature = options.temperature ?? (settings.moduleSettings?.[(options.module || 'search') as keyof typeof settings.moduleSettings]?.temperature ?? 0);
  
  if (!apiKey && !settings.useInternalProxy) {
    throw new Error('未配置个人的 API Key。请前往“AI引擎配置”标签页进行设置，或者开启“使用内置中转”以使用系统默认 Key。');
  }

  const modelName = options.model || settings.modelName;

  let geminiContents: any[] = [];
  if (settings.provider === 'gemini') {
    if (Array.isArray(prompt)) {
      if (prompt.length > 0 && (prompt[0].parts || prompt[0].role)) {
        // Map OpenAI-style roles to Gemini roles if needed
        geminiContents = prompt.map(m => ({
          role: m.role === 'assistant' ? 'model' : (m.role === 'system' ? 'user' : m.role),
          parts: Array.isArray(m.content) ? m.content : [{ text: String(m.content || m.text || '') }]
        }));
      } else {
        geminiContents = [{ role: 'user', parts: prompt.map(p => typeof p === 'string' ? { text: p } : p) }];
      }
    } else {
      geminiContents = [{ role: 'user', parts: [{ text: typeof prompt === 'string' ? prompt : JSON.stringify(prompt) }] }];
    }
  }

  const maxRetries = options.retries !== undefined ? options.retries : 10;
  let attempt = 0;
  while (true) {
    try {
      // Force using the secure Express server-side proxy route to completely avoid CORS, direct access blocks,
      // and platform gRPC inline-data payload size limits (ProxyUnaryCall 500 error).
      if (true) { // settings.useInternalProxy
        // Determine payload format
        const isGemini = settings.provider === 'gemini';
        
        const body: any = isGemini 
          ? {
              model: modelName,
              contents: geminiContents,
              ...(options.systemInstruction ? { system_instruction: { parts: [{ text: options.systemInstruction }] } } : {}),
              ...(options.tools ? { tools: options.tools } : {}),
              ...(options.responseMimeType || options.responseSchema || effectiveTemperature !== undefined ? {
                generation_config: {
                  ...(effectiveTemperature !== undefined ? { temperature: effectiveTemperature } : {}),
                  ...(options.responseMimeType ? { response_mime_type: options.responseMimeType } : {}),
                  ...(options.responseSchema ? { response_schema: options.responseSchema } : {}),
                }
              } : {})
            }
          : {
              model: modelName,
              messages: Array.isArray(prompt) && prompt.length > 0 && prompt[0].role 
                ? [
                    ...(options.systemInstruction ? [{ role: 'system', content: options.systemInstruction }] : []),
                    ...prompt
                  ]
                : [
                    ...(options.systemInstruction ? [{ role: 'system', content: options.systemInstruction }] : []),
                    { role: 'user', content: typeof prompt === 'string' ? prompt : JSON.stringify(prompt) }
                  ],
              temperature: effectiveTemperature,
              response_format: options.responseMimeType === 'application/json' ? { type: 'json_object' } : undefined
            };

        let resData: any = null;
        let resStatus = 200;
        
        try {
          let userPhone = '';
          try {
            const stored = localStorage.getItem('v_auth_state_v1');
            if (stored) {
              const parsed = JSON.parse(stored);
              userPhone = parsed?.user?.['手机号'] || parsed?.user?.phone || '';
            }
          } catch (e) {}

          const payload = {
            baseUrl: settings.proxyUrl,
            apiKey: apiKey,
            body: body,
            phone: userPhone
          };
          
          const payloadString = JSON.stringify(payload);
          const payloadMB = payloadString.length / (1024 * 1024);
          if (payloadMB > 20) { // Gemini's physical inlineData limit is approx 20MB
             throw new Error(`请求体积 (${payloadMB.toFixed(1)}MB) 超过了单次请求物理支持上限 (约20MB)。请减少单次处理的文件数量。`);
          }

          const client = getSocket();
          if (!client.connected) {
             await new Promise<void>((resolve, reject) => {
               client.once('connect', resolve);
               client.once('connect_error', reject);
               setTimeout(() => client.connected ? resolve() : reject(new Error('WebSocket connection timeout')), 5000);
             });
          }

          const socketProxyResult = await new Promise<any>((resolve, reject) => {
             client.emit('ai-proxy', payload, (response: any) => {
                resolve(response);
             });
             // Set a long timeout for file processing if needed
             setTimeout(() => reject(new Error('WebSocket proxy response timeout (600s)')), 600000);
          });
          
          resStatus = socketProxyResult.status;
          resData = socketProxyResult.data;
        } catch (err: any) {
          throw new Error('网络请求或 WebSocket 连接异常：' + (err.message || String(err)));
        }

        if (typeof resData === 'string') {
          const isHtml = /^\s*<(!DOCTYPE|html)/i.test(resData.trim());
          if (isHtml) {
            throw new Error(`AI 服务网关异常 (${resStatus})。服务器返回了 HTML 错误页，内容为: ${resData.substring(0, 50)}...`);
          }
        }
        
        if (resStatus !== 200) {
          const msg = resData?.message || resData?.error?.message || `AI 服务响应异常 (${resStatus})`;
          throw new Error(msg);
        }

        if (!resData) {
          throw new Error(`AI 服务响应解析失败，收到的数据为空！接口已正常建立 (状态码: ${resStatus})，但未接收到有效 JSON 载荷值。如果您上传了大型附件，可能是由于网关超出了反向代理的传输大小限制导致，请尝试减少复选标记的文件并设为“仅核对”。`);
        }
        
        const data = resData;
        
        // Parse response
        if (isGemini) {
          // Gemini format
          const usage = data.usageMetadata ? {
            promptTokens: data.usageMetadata.promptTokenCount || 0,
            completionTokens: data.usageMetadata.candidatesTokenCount || 0,
            totalTokens: data.usageMetadata.totalTokenCount || (data.usageMetadata.promptTokenCount + data.usageMetadata.candidatesTokenCount) || 0
          } : undefined;

          if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
            return {
              text: data.candidates[0].content.parts[0].text,
              usage
            };
          }
          if (data.candidates?.[0]?.finishReason === 'SAFETY' || data.candidates?.[0]?.finishReason === 'RECITATION') {
            throw new Error(`AI 响应被安全策略拦截 (finishReason: ${data.candidates[0].finishReason})`);
          }
          throw new Error(`AI 返回内容为空，请检查接口状态 (finishReason: ${data.candidates?.[0]?.finishReason || '未知'})`);
        } else {
          // OpenAI format
          const usage = data.usage ? {
            promptTokens: data.usage.prompt_tokens || 0,
            completionTokens: data.usage.completion_tokens || 0,
            totalTokens: data.usage.total_tokens || (data.usage.prompt_tokens + data.usage.completion_tokens) || 0
          } : undefined;

          if (data.choices?.[0]?.message?.content) {
            return {
              text: data.choices[0].message.content,
              usage
            };
          }
          throw new Error('AI 返回内容为空');
        }
      } else {
        // Fallback to direct client-side call if internal proxy is disabled
        if (settings.provider === 'openai') {
           let baseUrl = settings.proxyUrl ? settings.proxyUrl.replace(/\/$/, '') : 'https://api.openai.com/v1';
            
            // Auto-correction for common provider endpoints if entered without proper suffix
            const lowerUrl = baseUrl.toLowerCase();
            if (lowerUrl.includes('api.deepseek.com') && !lowerUrl.includes('/v1') && !lowerUrl.includes('/beta')) {
              baseUrl = baseUrl.replace(/api\.deepseek\.com\/?$/, 'api.deepseek.com/v1');
            } else if (lowerUrl.includes('api.moonshot.cn') && !lowerUrl.includes('/v1')) {
              baseUrl = baseUrl.replace(/api\.moonshot\.cn\/?$/, 'api.moonshot.cn/v1');
            } else if (lowerUrl.includes('dashscope.aliyuncs.com') && !lowerUrl.includes('/compatible-mode')) {
              baseUrl = baseUrl.replace(/dashscope\.aliyuncs\.com\/?$/, 'dashscope.aliyuncs.com/compatible-mode/v1');
            } else if (lowerUrl.includes('api.openai.com') && !lowerUrl.includes('/v1')) {
              baseUrl = baseUrl.replace(/api\.openai\.com\/?$/, 'api.openai.com/v1');
            }
           const endpoint = baseUrl.endsWith('/chat/completions') ? baseUrl : `${baseUrl}/chat/completions`;
           
           const messages = Array.isArray(prompt) && prompt.length > 0 && prompt[0].role 
             ? [
                 ...(options.systemInstruction ? [{ role: 'system', content: options.systemInstruction }] : []),
                 ...prompt
               ]
             : [
                 ...(options.systemInstruction ? [{ role: 'system', content: options.systemInstruction }] : []),
                 { role: 'user', content: typeof prompt === 'string' ? prompt : JSON.stringify(prompt) }
               ];

           let res;
           try {
             res = await fetch(endpoint, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                  model: modelName,
                  messages: messages,
                  temperature: effectiveTemperature,
                })
             });
           } catch (err: any) {
             if (err.message === 'Failed to fetch') {
                throw new Error('服务无响应 (Failed to fetch)。可能是单次上传文件体积过大（被网关拦截），或者当前网络问题导致。请减少文件数量后重试。');
             }
             throw err;
           }
           if (!res.ok) {
             let errorText = '';
             try {
               const contentType = res.headers.get('content-type') || '';
               if (contentType.includes('application/json')) {
                 const errData = await res.json();
                 errorText = errData.message || errData.error?.message || JSON.stringify(errData);
               } else {
                 errorText = await res.text();
                 if (errorText.includes('<!DOCTYPE') || errorText.includes('<html')) {
                    errorText = '服务器返回了 HTML 错误页，可能是请求超时。';
                 }
               }
             } catch(e) {}
             throw new Error(`OpenAI 接口报错: ${res.status} ${errorText}`);
           }
           
           let data;
           try {
             data = await res.json();
           } catch (e) {
             throw new Error('OpenAI 响应解析失败，收到的不是合法的 JSON 数据。');
           }

           const usage = data.usage ? {
             promptTokens: data.usage.prompt_tokens || 0,
             completionTokens: data.usage.completion_tokens || 0,
             totalTokens: data.usage.total_tokens || (data.usage.prompt_tokens + data.usage.completion_tokens) || 0
           } : undefined;

           return {
             text: data.choices[0].message.content,
             usage
           };
        } else {
           const baseUrl = settings.proxyUrl ? settings.proxyUrl.replace(/\/$/, '') : 'https://generativelanguage.googleapis.com';
           
           let fetchUrl = `${baseUrl}/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
           if (settings.proxyUrl && (settings.proxyUrl.includes('/v1') || settings.proxyUrl.includes('generateContent'))) {
              fetchUrl = settings.proxyUrl.includes('?') ? `${settings.proxyUrl}&key=${apiKey}` : `${settings.proxyUrl}?key=${apiKey}`;
           }
           
           const payload: any = {
             contents: geminiContents,
             ...(options.tools ? { tools: options.tools } : {})
           };
           
           if (options.systemInstruction) {
             payload.systemInstruction = {
               parts: [{ text: options.systemInstruction }]
             };
           }
           
           const configObj: any = {};
           if (options.responseMimeType) configObj.responseMimeType = options.responseMimeType;
           if (options.responseSchema) {
              const uppercaseSchemaTypes = (schema: any): any => {
                if (!schema || typeof schema !== 'object') return schema;
                if (Array.isArray(schema)) {
                  return schema.map(uppercaseSchemaTypes);
                }
                const result: any = {};
                for (const key of Object.keys(schema)) {
                  if (key === 'type' && typeof schema[key] === 'string') {
                    result[key] = schema[key].toUpperCase();
                  } else {
                    result[key] = uppercaseSchemaTypes(schema[key]);
                  }
                }
                return result;
              };
              configObj.responseSchema = uppercaseSchemaTypes(options.responseSchema);
            }
           if (effectiveTemperature !== undefined) configObj.temperature = effectiveTemperature;
           
           if (Object.keys(configObj).length > 0) {
             payload.generationConfig = configObj;
           }

           const res = await fetch(fetchUrl, {
             method: 'POST',
             headers: {
               'Content-Type': 'application/json'
             },
             body: JSON.stringify(payload)
           });

           if (!res.ok) {
             let errorText = '';
             try {
               const errData = await res.json();
               errorText = errData.message || errData.error?.message || JSON.stringify(errData);
             } catch (e) {
               errorText = await res.text().catch(() => '未知 HTTP 错误');
             }
             throw new Error(`Gemini 接口报错: ${res.status} ${errorText}`);
           }

           let data;
           try {
             data = await res.json();
           } catch (e) {
             throw new Error('Gemini API 响应解析失败，收到的不是合法的 JSON 数据（可能是由于代理报错或者网络错误，收到 HTML）。');
           }

           const usage = data.usageMetadata ? {
             promptTokens: data.usageMetadata.promptTokenCount || 0,
             completionTokens: data.usageMetadata.candidatesTokenCount || 0,
             totalTokens: data.usageMetadata.totalTokenCount || (data.usageMetadata.promptTokenCount + data.usageMetadata.candidatesTokenCount) || 0
           } : undefined;

           if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
             return {
               text: data.candidates[0].content.parts[0].text,
               usage
             };
           }
           if (data.candidates?.[0]?.finishReason === 'SAFETY' || data.candidates?.[0]?.finishReason === 'RECITATION') {
             throw new Error(`AI 响应被安全策略拦截 (finishReason: ${data.candidates[0].finishReason})`);
           }
           throw new Error(`AI 返回内容为空，请检查接口状态 (finishReason: ${data.candidates?.[0]?.finishReason || '未知'})`);
        }
       }
    } catch (err: any) {
      attempt++;
      
      const msg = err.message ? String(err.message).toLowerCase() : "";
      
      // 区分是硬性的配额超限还是临时的并发/频率限制
      const isQuotaError = msg.includes("quota") || msg.includes("免费额度已达上限") || msg.includes("exhausted") || msg.includes("resource_exhausted");
      
      // Fix: fail fast for generic 429 and Quota Exceeded!
      if (isQuotaError) {
          throw new Error("AI 接口免费额度已达上限（Quota Exceeded）。请尝试：1. 稍后重试；2. 减少上传文件数量；3. 在此页面底部（或对话框左下角）【应用设置】中配置您个人的 GEMINI_API_KEY 以获得专属服务额度。");
      }
      
      if (attempt > maxRetries) throw err;
      
      if (msg.includes("429") || msg.includes("rate limit") || msg.includes("503") || msg.includes("high demand") || msg.includes("overloaded") || msg.includes("resource_exhausted") || msg.includes("too many requests")) {
          let delayMs = 6000;
          const retryMatch = msg.match(/retry in\s+([0-9.]+)(s|ms)/i);
          if (retryMatch) {
             const val = parseFloat(retryMatch[1]);
             if (retryMatch[2] === 's') delayMs = val * 1000;
             else delayMs = val;
             delayMs += 1000;
          } else {
             // Exponential backoff if no specific retry time given
             delayMs = 4000 * Math.pow(1.5, attempt);
          }
          // Add some jitter
          delayMs += Math.random() * 2000;
          console.warn(`[AI 接口] Rate Limit 触发，等待 ${Math.round(delayMs)}ms 后重试 (尝试 ${attempt}/${maxRetries})...`);
          await sleep(delayMs);
          continue;
      } else if (msg.includes('failed to fetch') || msg.includes('被网关拦截') || msg.includes('网络问题') || msg.includes('网关异常') || msg.includes('html 错误页') || msg.includes('html') || msg.includes('解析失败')) {
          const delayMs = 3000 + Math.random() * 1000;
          console.warn(`[AI 接口] 网络异常 (${msg})，等待 ${Math.round(delayMs)}ms 后重试 (尝试 ${attempt}/${maxRetries})...`);
          await sleep(delayMs);
          continue;
      }
      throw err;
    }
  }
}
