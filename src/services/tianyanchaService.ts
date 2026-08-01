// Tianyancha Open API Service for Enterprise Info & Certification Info
// Includes local storage caching to prevent redundant API calls for the same enterprise.

export interface TianyanchaICInfo {
  name: string;
  creditCode: string;
  legalPerson: string;
  registeredCapital: string;
  establishDate: string;
  address: string;
  scope: string;
  status: string;
  phone: string;
  email: string;
  socialStaffNum?: number | string;
  staffNumRange?: string;
  companyOrgType?: string;
  raw: any;
  fromCache?: boolean;
  isNetworkError?: boolean;
  errorMessage?: string;
}

export interface CertItemDetail {
  title: string;
  content: string;
}

export interface TianyanchaCertItem {
  certNo: string;
  certificateName: string;
  status: string;
  startDate: string;
  endDate: string;
  certOrg: string;
  scope: string;
  coveredHeadcount?: string;
  orgAddress?: string;
  certBasis?: string;
  firstAwardDate?: string;
  detail?: CertItemDetail[];
}

export interface TianyanchaCertData {
  total: number;
  items: TianyanchaCertItem[];
  certScope: string;
  primaryHeadcount?: string;
  primaryAddress?: string;
  raw: any;
  fromCache?: boolean;
  isNetworkError?: boolean;
  errorMessage?: string;
}

export interface FullCompanyFetchResult {
  icData: TianyanchaICInfo;
  certData: TianyanchaCertData;
}

const IC_CACHE_KEY = 'tianyancha_ic_cache_v5';
const CERT_CACHE_KEY = 'tianyancha_cert_cache_v5';

// Local Cache Helper functions
function getLocalCache<T>(storageKey: string, companyName: string): T | null {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const map = JSON.parse(raw);
    const key = companyName.trim().toLowerCase();
    const cached = map[key];
    if (!cached || !cached.data) return null;
    
    // Validate cached data completeness
    if (storageKey === IC_CACHE_KEY && !cached.data.creditCode) {
      return null;
    }
    return cached;
  } catch {
    return null;
  }
}

function setLocalCache<T>(storageKey: string, companyName: string, data: T): void {
  try {
    const raw = localStorage.getItem(storageKey);
    const map = raw ? JSON.parse(raw) : {};
    const key = companyName.trim().toLowerCase();
    map[key] = {
      data,
      timestamp: Date.now()
    };
    localStorage.setItem(storageKey, JSON.stringify(map));
  } catch (e) {
    console.warn('Failed to save to local cache:', e);
  }
}

// Utility to format timestamp or date string to YYYY-MM-DD
function formatDate(val: any): string {
  if (!val) return '';
  if (typeof val === 'number') {
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
  }
  if (typeof val === 'string') {
    if (/^\d{10,13}$/.test(val)) {
      const d = new Date(Number(val));
      if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    }
    return val.split('T')[0].split(' ')[0];
  }
  return '';
}

/**
 * Fetch Enterprise Basic Info (工商信息 API: /services/open/ic/baseinfo/normal)
 */
export async function fetchCompanyBaseInfo(companyName: string): Promise<TianyanchaICInfo> {
  const trimmedName = companyName.trim();
  if (!trimmedName) {
    throw new Error('企业名称不能为空');
  }

  // 1. Check local cache first
  const cached = getLocalCache<{ data: TianyanchaICInfo }>(IC_CACHE_KEY, trimmedName);
  if (cached && cached.data) {
    console.log(`[Tianyancha Cache Hit] Enterprise IC Info retrieved from local cache for: ${trimmedName}`);
    return { ...cached.data, fromCache: true };
  }

  // 2. Call API via server proxy
  try {
    const response = await fetch('/api/tianyancha/ic/baseinfo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyword: trimmedName })
    });

    const res = await response.json();
    
    // Check for network interception / WAF block / non-zero error_code
    if (res.network_error || (res.error_code && res.error_code !== 0) || !res.result) {
      console.warn('[Tianyancha IC API Response Warning] API returned error or network block:', res.reason);
      return {
        name: trimmedName,
        creditCode: '',
        legalPerson: '',
        registeredCapital: '',
        establishDate: '',
        address: '',
        scope: '',
        status: '',
        phone: '',
        email: '',
        socialStaffNum: '',
        staffNumRange: '',
        companyOrgType: '',
        raw: res,
        fromCache: false,
        isNetworkError: true,
        errorMessage: res.reason || '网络链接可能有问题，未能成功获取企事业单位工商档案信息'
      };
    }

    // Parse result from Tianyancha JSON
    const resultObj = res.result || {};
    
    const name = resultObj.name || resultObj.basic?.name || resultObj.entname || trimmedName;
    const creditCode = resultObj.creditCode || resultObj.taxNumber || resultObj.property3 || resultObj.regNumber || resultObj.uniscid || resultObj.creditcode || '';
    const legalPerson = resultObj.legalPersonName || resultObj.operName || resultObj.frname || resultObj.lerep || '';
    const registeredCapital = resultObj.regCapital || resultObj.actualCapital || resultObj.regist_capi || '';
    const establishDate = formatDate(resultObj.estiblishTime || resultObj.startDate || resultObj.fromTime || resultObj.esdate);
    const address = resultObj.regLocation || resultObj.regLocationHalfWidth || resultObj.address || resultObj.dom || '';
    const scope = resultObj.businessScope || resultObj.opScope || resultObj.scope || '';
    const status = resultObj.regStatus || resultObj.entstatus || '存续';
    const phone = resultObj.phoneNumber || resultObj.phone || resultObj.contact_number || '';
    const email = resultObj.email || '';
    const socialStaffNum = resultObj.socialStaffNum !== undefined ? resultObj.socialStaffNum : '';
    const staffNumRange = resultObj.staffNumRange || '';
    const companyOrgType = resultObj.companyOrgType || '';

    const parsedIC: TianyanchaICInfo = {
      name,
      creditCode,
      legalPerson,
      registeredCapital,
      establishDate,
      address,
      scope,
      status,
      phone,
      email,
      socialStaffNum,
      staffNumRange,
      companyOrgType,
      raw: res,
      fromCache: false,
      isNetworkError: false
    };

    // Store in local cache only when valid
    setLocalCache(IC_CACHE_KEY, trimmedName, parsedIC);

    return parsedIC;
  } catch (error: any) {
    console.warn('[Tianyancha IC API Warning] Fetch failed:', error);
    const fallbackIC: TianyanchaICInfo = {
      name: trimmedName,
      creditCode: '',
      legalPerson: '',
      registeredCapital: '',
      establishDate: '',
      address: '',
      scope: '',
      status: '',
      phone: '',
      email: '',
      raw: null,
      fromCache: false,
      isNetworkError: true,
      errorMessage: '网络链接可能有问题，接口链接无法建立或数据受限'
    };
    return fallbackIC;
  }
}

/**
 * Fetch Enterprise Certificate Info (资质证书 API: /services/open/m/certificate/2.0)
 */
export async function fetchCompanyCertificates(companyName: string): Promise<TianyanchaCertData> {
  const trimmedName = companyName.trim();
  if (!trimmedName) {
    throw new Error('企业名称不能为空');
  }

  // 1. Check local cache first
  const cached = getLocalCache<{ data: TianyanchaCertData }>(CERT_CACHE_KEY, trimmedName);
  if (cached && cached.data) {
    console.log(`[Tianyancha Cache Hit] Enterprise Cert Info retrieved from local cache for: ${trimmedName}`);
    return { ...cached.data, fromCache: true };
  }

  // 2. Call API via server proxy
  try {
    const response = await fetch('/api/tianyancha/certificate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: trimmedName })
    });

    const res = await response.json();

    if (res.network_error || (res.error_code && res.error_code !== 0)) {
      console.warn('[Tianyancha Cert API Response Warning] API returned error or network block:', res.reason);
      return {
        total: 0,
        items: [],
        certScope: '',
        raw: res,
        fromCache: false,
        isNetworkError: true,
        errorMessage: res.reason || '网络链接可能有问题，未能成功获取企事业单位认证证书记录'
      };
    }

    const resultObj = res.result || {};
    const rawItems: any[] = resultObj.items || resultObj.datalist || resultObj.certificates || [];

    let certScope = '';
    let primaryHeadcount = '';
    let primaryAddress = '';

    const items: TianyanchaCertItem[] = rawItems.map((item: any) => {
      const detailArr: CertItemDetail[] = Array.isArray(item.detail) ? item.detail : [];
      
      const certNo = item.certNo || item.cert_no || detailArr.find(d => d.title?.includes('证书编号'))?.content || '-';
      const certificateName = item.certificateName || item.cert_project || item.title || item.name || '-';
      const endDate = formatDate(item.endDate || item.expire_date || detailArr.find(d => d.title?.includes('截止') || d.title?.includes('到期'))?.content);
      const startDate = formatDate(item.startDate || item.award_date || detailArr.find(d => d.title?.includes('颁证日期') || d.title?.includes('发证日期'))?.content);
      
      const certOrg = item.certOrg || detailArr.find(d => d.title === '发证机构-机构名称' || d.title?.includes('发证机构'))?.content || '-';
      
      // Parse detailed fields from Tianyancha detail array
      const scopeDetail = detailArr.find(d => d.title === '认证覆盖的业务范围' || (d.title?.includes('业务范围') && !d.title?.includes('发证机构')) || d.title?.includes('认证范围'))?.content;
      const statusDetail = detailArr.find(d => d.title === '证书状态' || d.title?.includes('状态'))?.content;
      const headcountDetail = detailArr.find(d => d.title?.includes('本证书体系覆盖人数') || d.title?.includes('覆盖人数') || d.title?.includes('体系人数'))?.content;
      const addressDetail = detailArr.find(d => d.title === '获证组织-组织地址' || d.title?.includes('场所名称及地址') || d.title?.includes('组织地址'))?.content;
      const basisDetail = detailArr.find(d => d.title?.includes('认证依据'))?.content;
      const firstAwardDetail = formatDate(detailArr.find(d => d.title?.includes('初次获证'))?.content);

      const itemScope = scopeDetail || item.scope || item.cert_scope || '';
      if (itemScope && !certScope) {
        certScope = itemScope;
      }
      if (headcountDetail && !primaryHeadcount) {
        primaryHeadcount = headcountDetail;
      }
      if (addressDetail && !primaryAddress) {
        primaryAddress = addressDetail;
      }

      return {
        certNo,
        certificateName,
        status: statusDetail || item.status || (endDate && new Date(endDate) < new Date() ? '过期失效' : '有效'),
        startDate,
        endDate,
        certOrg,
        scope: itemScope,
        coveredHeadcount: headcountDetail,
        orgAddress: addressDetail,
        certBasis: basisDetail,
        firstAwardDate: firstAwardDetail,
        detail: detailArr
      };
    });

    const parsedCert: TianyanchaCertData = {
      total: resultObj.total || items.length,
      items,
      certScope,
      primaryHeadcount,
      primaryAddress,
      raw: res,
      fromCache: false
    };

    // Store in local cache
    setLocalCache(CERT_CACHE_KEY, trimmedName, parsedCert);

    return parsedCert;
  } catch (error: any) {
    console.warn('[Tianyancha Cert API Warning] Fetch failed:', error);
    const fallbackCert: TianyanchaCertData = {
      total: 0,
      items: [],
      certScope: '',
      raw: null,
      fromCache: false,
      isNetworkError: true,
      errorMessage: '网络链接可能有问题，接口链接无法建立或数据受限'
    };
    return fallbackCert;
  }
}

/**
 * Combined Fetch for Enterprise Basic Info & Certification Info
 */
export async function fetchFullCompanyData(companyName: string): Promise<FullCompanyFetchResult> {
  const [icData, certData] = await Promise.all([
    fetchCompanyBaseInfo(companyName),
    fetchCompanyCertificates(companyName)
  ]);

  return { icData, certData };
}
