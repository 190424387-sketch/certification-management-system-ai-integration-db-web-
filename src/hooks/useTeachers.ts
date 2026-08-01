import { useState, useTransition, useMemo } from 'react';

export function useTeachers() {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [isLoadingDb, setIsLoadingDb] = useState(false);

  const fetchTeachers = async () => {
     setIsLoadingDb(true);
     try {
        const res = await fetch('/api/db/teachers');
        let data; try { data = await res.json(); } catch(e) { throw new Error("JSON parse err"); }
        if (!res.ok) throw new Error(data.error || 'Failed to fetch');
        setTeachers(data);
     } catch (err: any) {
        alert('数据获取失败: ' + err.message);
     } finally {
        setIsLoadingDb(false);
     }
  };

  return {
    teachers,
    isLoadingDb,
    fetchTeachers
  };
}

export function useTeacherSearch(teachers: any[], pageSize: number) {
  const [searchQueryInput, setSearchQueryInput] = useState('');
  const [activeSearchQuery, setActiveSearchQuery] = useState('');
  const [regionQueryInput, setRegionQueryInput] = useState('');
  const [activeRegionQuery, setActiveRegionQuery] = useState('');
  const [jobTypeInput, setJobTypeInput] = useState<'all' | 'fulltime' | 'parttime'>('all');
  const [activeJobType, setActiveJobType] = useState<'all' | 'fulltime' | 'parttime'>('all');
  const [expertInput, setExpertInput] = useState<'all' | 'expert' | 'nonexpert'>('all');
  const [activeExpert, setActiveExpert] = useState<'all' | 'expert' | 'nonexpert'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [isPending, startTransition] = useTransition();
  const [highlightedTeacher, setHighlightedTeacher] = useState<string | null>(null);

  const handleSearchExecute = (
     searchOverride?: string, 
     regionOverride?: string,
     jobTypeOverride?: 'all' | 'fulltime' | 'parttime',
     expertOverride?: 'all' | 'expert' | 'nonexpert'
  ) => {
     startTransition(() => {
        if (searchOverride !== undefined) {
           setSearchQueryInput(searchOverride);
           setActiveSearchQuery(searchOverride.trim());
        } else {
           setActiveSearchQuery(searchQueryInput.trim());
        }
        if (regionOverride !== undefined) {
           setRegionQueryInput(regionOverride);
           setActiveRegionQuery(regionOverride.trim());
        } else {
           setActiveRegionQuery(regionQueryInput.trim());
        }
        if (jobTypeOverride !== undefined) {
           setJobTypeInput(jobTypeOverride);
           setActiveJobType(jobTypeOverride);
        } else {
           setActiveJobType(jobTypeInput);
        }
        if (expertOverride !== undefined) {
           setExpertInput(expertOverride);
           setActiveExpert(expertOverride);
        } else {
           setActiveExpert(expertInput);
        }
        setCurrentPage(1);
        setHighlightedTeacher(null);
     });
  };

  const filteredTeachersWithDetails = useMemo(() => {
     const hasActiveFilter = activeSearchQuery || activeRegionQuery || activeJobType !== 'all' || activeExpert !== 'all';
     if (!hasActiveFilter) {
        return teachers.map(t => ({ teacher: t, matchCount: 0, totalQueries: 0 }));
     }
     
     const queries = activeSearchQuery.split(/[;；,，\s]+/).map(q => q.trim().toLowerCase()).filter(Boolean);
     const regionQueries = activeRegionQuery.split(/[;；,，\s]+/).map(rq => rq.trim().toLowerCase()).filter(Boolean);

     const results = teachers.map(t => {
        // 1. Filter by Job Type (专兼职)
        const jobType = String(t['专兼职'] || t.jobType || t.job_type || t.JobType || '').trim();
        const isFullTime = jobType.includes('专职') || jobType.includes('专审') || jobType.includes('专兼');
        if (activeJobType === 'fulltime' && !isFullTime) {
           return null;
        }
        if (activeJobType === 'parttime' && isFullTime) {
           return null;
        }

        // 2. Filter by Expert (技术专家)
        const qualification = String(t['注册资格'] || t['资质级别'] || t.qualification || t.Qualification || '').trim();
        const isExpert = qualification.includes('专家') || qualification.includes('技术专家') || qualification.includes('评估员');
        if (activeExpert === 'expert' && !isExpert) {
           return null;
        }
        if (activeExpert === 'nonexpert' && isExpert) {
           return null;
        }

        // 3. Filter by Region (地域)
        const address = String(t['通讯地址'] || t.address || t.Address || '').toLowerCase();
        let regionMatched = true;
        if (regionQueries.length > 0) {
           regionMatched = regionQueries.every(rq => address.includes(rq));
        }

        if (!regionMatched) {
           return null;
        }

        // 4. Calculate Search Query Match
        if (queries.length === 0) {
           return { teacher: t, matchCount: 1, totalQueries: 0 };
        }

        const tValuesStr = Object.values(t).join('\n').toLowerCase();
        const codeStr = String(t['专业类别'] || t['代码'] || t['代码类型'] || t.code || t.Code || '').trim();

        let matchCount = 0;

        for (const q of queries) {
           if (!tValuesStr.includes(q)) continue;

           const isTwoPairs = /^\d{1,2}\.\d{1,2}$/.test(q);
           const isThreePairs = /^\d{2}\.\d{2}\.\d{2}$/.test(q);

           if (isTwoPairs || isThreePairs) {
              const escapeRegExp = (str: string) => str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
              const strictQueryRegex = new RegExp(`(?<![\\d\\.])` + escapeRegExp(q) + `(?![\d\.])`, 'i');
              
              const parts = codeStr.split(/[;；\n]/).map(p => p.trim()).filter(Boolean);
              let currentSystem = '';
              let matchedCode = false;
              
              const checkMatch = (val: string) => {
                 let cleanVal = val.replace(/[(（][^)）]*[)）]/g, '').trim();
                 const sysPrefixMatch = cleanVal.match(/^(?:QMS|EMS|OHSMS|FSMS|ISMS|EnMS|ITSMS|HACCP|Q|E|S)[:：\-\s]*/i);
                 if (sysPrefixMatch) {
                    cleanVal = cleanVal.substring(sysPrefixMatch[0].length).trim();
                 }
                 return strictQueryRegex.test(cleanVal);
              };

              for (const p of parts) {
                 let codeVal = p;
                 const match = p.match(/^([A-Za-z0-9]+)(?:[\u4e00-\u9fa5]*)?[:：](.*)/i);
                 if (match) {
                    currentSystem = match[1].toUpperCase();
                    codeVal = match[2].trim();
                 }
                 
                 if (currentSystem) {
                    if (isTwoPairs) {
                       if (currentSystem === 'ITSMS' || currentSystem === 'ISMS' || currentSystem === 'IT' || currentSystem === 'IS' || currentSystem === 'ENMS') {
                          if (checkMatch(codeVal)) { matchedCode = true; break; }
                       }
                    } else if (isThreePairs) {
                       if (checkMatch(codeVal)) { matchedCode = true; break; }
                    } else {
                       if (checkMatch(codeVal)) { matchedCode = true; break; }
                    }
                 } else {
                    if (checkMatch(codeVal)) { matchedCode = true; break; }
                 }
              }
              if (matchedCode) {
                 matchCount++;
              }
           } else {
              matchCount++;
           }
        }

        if (matchCount === 0) {
           return null;
        }

        return { teacher: t, matchCount, totalQueries: queries.length };
     }).filter(r => r !== null);

     results.sort((a, b) => b.matchCount - a.matchCount);
     return results;
  }, [teachers, activeSearchQuery, activeRegionQuery, activeJobType, activeExpert]);

  const filteredTeachers = useMemo(() => filteredTeachersWithDetails.map(r => r.teacher), [filteredTeachersWithDetails]);

  const uniqueFilterNames = useMemo(() => {
     const seen = new Set<string>();
     const result: { name: string; matchCount: number; totalQueries: number; suffix: string }[] = [];
     
     const getTeacherQesSuffix = (teacher: any, queries: string[]): string => {
        if (!queries || queries.length === 0) return '';
        
        const codeStr = String(teacher['专业类别'] || teacher['代码'] || teacher['代码类型'] || teacher.code || teacher.Code || '').trim();
        if (!codeStr) return '';

        const parts = codeStr.split(/[;；\n]/).map(p => p.trim()).filter(Boolean);
        let currentSystem = '';
        const systemCodeMap: Record<string, string[]> = {};

        for (const p of parts) {
           let codeVal = p;
           const match = p.match(/^([A-Za-z0-9]+)(?:[\u4e00-\u9fa5]*)?[:：](.*)/i);
           if (match) {
              currentSystem = match[1].toUpperCase();
              codeVal = match[2].trim();
           }
           if (currentSystem) {
              if (!systemCodeMap[currentSystem]) {
                 systemCodeMap[currentSystem] = [];
              }
              systemCodeMap[currentSystem].push(codeVal);
           }
        }

        const getCoreSystem = (sys: string): 'Q' | 'E' | 'S' | null => {
           const upper = sys.toUpperCase();
           if (upper.startsWith('Q')) return 'Q';
           if (upper.startsWith('E')) return 'E';
           if (upper.startsWith('S')) return 'S';
           return null;
        };

        const matchQueryWithCode = (q: string, rawSystem: string, codeVal: string): boolean => {
           const isTwoPairs = /^\d{1,2}\.\d{1,2}$/.test(q);
           const isThreePairs = /^\d{2}\.\d{2}\.\d{2}$/.test(q);
           
           const escapeRegExp = (str: string) => str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
           const strictQueryRegex = new RegExp(`(?<![\\d\\.])` + escapeRegExp(q) + `(?![\\d\\.])`, 'i');
           
           const checkMatch = (val: string) => {
              let cleanVal = val.replace(/[(（][^)）]*[)）]/g, '').trim();
              const sysPrefixMatch = cleanVal.match(/^(?:QMS|EMS|OHSMS|FSMS|ISMS|EnMS|ITSMS|HACCP|Q|E|S)[:：\-\s]*/i);
              if (sysPrefixMatch) {
                 cleanVal = cleanVal.substring(sysPrefixMatch[0].length).trim();
              }
              return strictQueryRegex.test(cleanVal);
           };

           const upperSys = rawSystem.toUpperCase();
           if (isTwoPairs) {
              if (upperSys === 'ITSMS' || upperSys === 'ISMS' || upperSys === 'IT' || upperSys === 'IS' || upperSys === 'ENMS') {
                 return checkMatch(codeVal);
              }
              return false;
           } else {
              return checkMatch(codeVal);
           }
        };

        const coreMatchedQueries: Record<'Q' | 'E' | 'S', Set<string>> = {
           Q: new Set<string>(),
           E: new Set<string>(),
           S: new Set<string>(),
        };

        for (const q of queries) {
           for (const [rawSys, codeVals] of Object.entries(systemCodeMap)) {
              const core = getCoreSystem(rawSys);
              if (core) {
                 for (const val of codeVals) {
                    if (matchQueryWithCode(q, rawSys, val)) {
                       coreMatchedQueries[core].add(q);
                    }
                 }
              }
           }
        }

        const nQ = coreMatchedQueries.Q.size;
        const nE = coreMatchedQueries.E.size;
        const nS = coreMatchedQueries.S.size;

        if (nQ === 0 && nE === 0 && nS === 0) return '';

        if (queries.length === 1) {
           let suffix = '';
           if (nQ > 0) suffix += 'Q';
           if (nE > 0) suffix += 'E';
           if (nS > 0) suffix += 'S';
           return suffix;
        } else {
           let suffix = '';
           if (nQ > 0) suffix += `Q${nQ}`;
           if (nE > 0) suffix += `E${nE}`;
           if (nS > 0) suffix += `S${nS}`;
           return suffix;
        }
     };

     const queries = activeSearchQuery.split(/[;；,，\s]+/).map(q => q.trim().toLowerCase()).filter(Boolean);

     for (const r of filteredTeachersWithDetails) {
        const name = String(r.teacher['姓名'] || r.teacher.name || r.teacher.Name || Object.values(r.teacher)[0]).trim();
        if (!seen.has(name)) {
           seen.add(name);
           const suffix = getTeacherQesSuffix(r.teacher, queries);
           result.push({ name, matchCount: r.matchCount, totalQueries: r.totalQueries, suffix });
        }
     }
     return result;
  }, [filteredTeachersWithDetails, activeSearchQuery]);

  const totalPages = Math.ceil(filteredTeachers.length / pageSize) || 1;
  const paginatedTeachers = filteredTeachers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleNameClick = (name: string) => {
     const index = filteredTeachers.findIndex(t => {
        const tName = String(t['姓名'] || t.name || t.Name || Object.values(t)[0]).trim();
        return tName === name;
     });
     if (index !== -1) {
        const page = Math.floor(index / pageSize) + 1;
        setCurrentPage(page);
        setHighlightedTeacher(name);
        setTimeout(() => {
           const el = document.getElementById(`teacher-row-${index}`);
           if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
           }
        }, 100);
     }
  };

  return {
    searchQueryInput,
    setSearchQueryInput,
    activeSearchQuery,
    regionQueryInput,
    setRegionQueryInput,
    activeRegionQuery,
    jobTypeInput,
    setJobTypeInput,
    activeJobType,
    expertInput,
    setExpertInput,
    activeExpert,
    currentPage,
    setCurrentPage,
    isPending,
    highlightedTeacher,
    handleSearchExecute,
    filteredTeachers,
    uniqueFilterNames,
    totalPages,
    paginatedTeachers,
    handleNameClick
  };
}
