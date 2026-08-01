import { useState, useEffect } from 'react';
import { findSchedulesForTeacher, formatDayRange, parseCodes, calculateMatch } from '../lib/scheduling-algorithm';

export function useScheduleGeneration(teachers: any[], scheduleData: any[]) {
  const [schedParams, setSchedParams] = useState(() => {
    try {
      const saved = localStorage.getItem('certMatch_sched_params');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
       preferredTeachers: '',
       codes: '',
       phase1People: '',
       phase1Days: '',
       phase2People: '',
       phase2Days: '',
       targetMonth: 'current' as 'current' | 'next'
    };
  });

  const [activeRecommendationIndex, setActiveRecommendationIndex] = useState(() => {
    try {
      const saved = localStorage.getItem('certMatch_sched_active_rec_idx');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return 0;
  });
  const [generateError, setGenerateError] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showRecommendations, setShowRecommendations] = useState(() => {
    try {
      const saved = localStorage.getItem('certMatch_sched_show_rec');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return false;
  });
  const [recommendations, setRecommendations] = useState<any[] | null>(() => {
    try {
      const saved = localStorage.getItem('certMatch_sched_recommendations');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return null;
  });

  // Save changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('certMatch_sched_params', JSON.stringify(schedParams));
    } catch (e) {}
  }, [schedParams]);

  useEffect(() => {
    try {
      localStorage.setItem('certMatch_sched_active_rec_idx', JSON.stringify(activeRecommendationIndex));
    } catch (e) {}
  }, [activeRecommendationIndex]);

  useEffect(() => {
    try {
      localStorage.setItem('certMatch_sched_show_rec', JSON.stringify(showRecommendations));
    } catch (e) {}
  }, [showRecommendations]);

  useEffect(() => {
    try {
      localStorage.setItem('certMatch_sched_recommendations', JSON.stringify(recommendations));
    } catch (e) {}
  }, [recommendations]);

  const handleGenerateSchedule = (onSuccess?: () => void) => {
     setGenerateError('');
     
     if (!schedParams.codes) {
        setGenerateError('请在顶部输入专业代码进行排程查询！');
        setShowRecommendations(true);
        return;
     }
     
     const p1Days = parseFloat(schedParams.phase1Days || '0') || 0;
     const p1People = parseInt(schedParams.phase1People || '1', 10);
     const p2Days = parseFloat(schedParams.phase2Days || '0') || 0;
     const p2People = parseInt(schedParams.phase2People || '1', 10);
     
     const p1Total = p1Days * p1People;
     const p2Total = p2Days * p2People;
     const totalManDays = p1Total + p2Total;

     if (totalManDays === 0) {
        setGenerateError('请填写一阶段和二阶段人数及人天数要求！');
        setShowRecommendations(true);
        return;
     }

     if ((p1People > 1 || p2People > 1) && p2Total < totalManDays * 0.75) {
        setGenerateError('二阶段总人日必须占整体总人日的超过75% (多人审核项目)，请重新输入验证通过后再生成！');
        setShowRecommendations(true);
        return;
     }

     if (teachers.length === 0) {
        setGenerateError('未能读取到数据库中的教师资质信息，请先使用"同步数据库代码"加载资质数据！');
        setShowRecommendations(true);
        return;
     }

     if (scheduleData.length === 0) {
        setGenerateError('未能获取到有效的排程表格数据。\n由于您移除了导入按钮，请先在下方的 WPS 文档表格中选中并复制 (Ctrl+C) 所有的排程数据，然后点击本行白色区域的任意空白处按粘贴 (Ctrl+V)，系统即可瞬间读取并生成排程！');
        setShowRecommendations(true);
        return;
     }

     setIsGenerating(true);
     setShowRecommendations(true);
     
     setTimeout(() => {
        let results: any[] = [];
        const inputCodesRaw = schedParams.codes.split(/[,;，；\s\n\t]+/);
        let inputCodes: string[] = [];
        inputCodesRaw.forEach(c => {
            let trimmed = c.trim();
            if (!trimmed) return;
            
            const sysPrefixMatch = trimmed.match(/^(?:QMS|EMS|OHSMS|FSMS|ISMS|EnMS|ITSMS|HACCP|Q|E|S)[:：\-\s]*/i);
            if (sysPrefixMatch) {
                trimmed = trimmed.substring(sysPrefixMatch[0].length).trim();
            }
            if (!trimmed) return;

            const matches = trimmed.match(/[0-9]{2}\.[0-9]{2}(\.[0-9]{2})?/g);
            if (matches && matches.join('').length >= trimmed.length - 2) {
                inputCodes.push(...matches);
            } else {
                inputCodes.push(trimmed);
            }
        });
        inputCodes = Array.from(new Set(inputCodes));
        const preferredNames = (schedParams.preferredTeachers || '').split(/[,;，；\s]+/).map(n => n.trim()).filter(Boolean);
        
        const cleanNameForPref = (n: string) => String(n).replace(/[\u200B-\u200D\uFEFF]/g, '').split(/[\(（\-\s]/)[0].trim();
        const cleanPrefNames = preferredNames.map(cleanNameForPref);
        
        try {
           const teachersFromDb = teachers.map((t: any) => {
              const codesStr = String(t['专业类别'] || t['代码'] || t['代码类型'] || t.code || t.Code || '').trim();
              const name = String(t['姓名'] || t.name || t.Name || Object.values(t)[0] || '').trim();
              const parsedCodes = parseCodes(codesStr);
              const cName = cleanNameForPref(name);
              const isPreferred = cleanPrefNames.includes(cName);
              const baseScore = calculateMatch(parsedCodes, inputCodes);
              const score = baseScore + (isPreferred ? 10000 : 0); // Boost preferred teachers always
              const jobType = String(t['专兼职'] || t.jobType || t.job_type || t.JobType || '');
              return { name, codesStr, score, isPreferred, jobType, baseScore };
           });

           const dbTeacherNameMap = new Map(teachersFromDb.map((t: any) => [cleanNameForPref(t.name), t]));

           let allSolutionsForTeachers: any[] = [];

           if (p1People === 1 && p2People === 1) {
              for (let reqRowIndex = 0; reqRowIndex < scheduleData.length; reqRowIndex++) {
                 const reqRow = scheduleData[reqRowIndex];
                 const rawName = String(reqRow.name || reqRow.Name || reqRow['姓名'] || '未知').trim();
                 const cName = cleanNameForPref(rawName);
                 
                 const dbTeacher = dbTeacherNameMap.get(cName);
                 const rawCodes = dbTeacher ? dbTeacher.codesStr : '';
                 const codeScore = dbTeacher ? dbTeacher.score : 0;
                 const isPref = dbTeacher ? dbTeacher.isPreferred : false;
                 
                 const tRow = {
                    name: rawName,
                    codesStr: rawCodes,
                    days: reqRow.days || []
                 };

                 const schedules = findSchedulesForTeacher(tRow, inputCodes, p1Days, p2Days, schedParams.targetMonth);
                 
                 if (schedules.length > 0) {
                    allSolutionsForTeachers.push({
                       name: rawName,
                       teacherIndex: reqRowIndex,
                       codeScore: codeScore,
                       bestScore: schedules[0].matchScore,
                       schedules: schedules
                    });
                 }
              }

              allSolutionsForTeachers.sort((a, b) => b.codeScore - a.codeScore);
              
              let resultIdx = 0;
              allSolutionsForTeachers.forEach((t, tIdx) => {
                 const otherSchedules = t.schedules.map((s: any) => ({ p1Cells: s.p1Cells, p2Cells: s.p2Cells }));
                 t.schedules.forEach((s: any, sIdx: number) => {
                    const p1Range = formatDayRange(s.p1Start, s.p1End);
                    const p2Range = formatDayRange(s.p2Start, s.p2End);
                    results.push({
                       globalIndex: resultIdx++,
                       name: t.name,
                       teacherIndex: t.teacherIndex,
                       solutionIndexInRow: sIdx,
                       totalSolutionsInRow: t.schedules.length,
                       matchLevel: t.codeScore > 0 ? (t.codeScore >= 10000 ? '⭐优先安排' : '专业代码匹配') : '仅具备可用时间',
                       reason: `方案 ${sIdx + 1}/${t.schedules.length} :\n一阶段: ${p1Range} (${p1Days}天)\n二阶段: ${p2Range} (${p2Days}天)`,
                       id: Math.random().toString(36).substring(2, 9),
                       p1Cells: s.p1Cells,
                       p2Cells: s.p2Cells,
                       otherSchedulesInRow: otherSchedules,
                       p1TeacherIndices: [t.teacherIndex],
                       p2TeacherIndices: [t.teacherIndex]
                    });
                 });
              });
           } else {
              let resultIdx = 0;
              const maxCols = 124;
              const minColIdx = schedParams.targetMonth === 'next' ? 0 : (new Date().getDate() + 3 - 1) * 2;
              const isEmpty = (val: any) => val === undefined || val === null || String(val).replace(/[\u200B-\u200D\uFEFF]/g, '').trim() === '';
              const getCells = (startCol: number, days: number) => {
                 const cells = [];
                 let remaining = days * 2;
                 let col = startCol;
                 while (remaining >= 0.5) {
                    cells.push(col);
                    col++;
                    remaining--;
                 }
                 return cells;
              };

              const tRows = scheduleData.map((reqRow: any, reqRowIndex: number) => {
                 const rawName = String(reqRow.name || reqRow.Name || reqRow['姓名'] || '未知').trim();
                 const cName = cleanNameForPref(rawName);
                 const dbTeacher = dbTeacherNameMap.get(cName);
                 const codeScore = dbTeacher ? dbTeacher.score : 0;
                 const baseScore = dbTeacher ? dbTeacher.baseScore : 0;
                 const isPref = dbTeacher ? dbTeacher.isPreferred : false;
                 const jobType = dbTeacher ? dbTeacher.jobType : '';
                 const isFullTime = jobType.includes('专审');
                 const linearData: string[] = [];
                 (reqRow.days || []).forEach((d: any) => {
                    linearData.push(d.am);
                    linearData.push(d.pm);
                 });
                 return { teacherIndex: reqRowIndex, name: rawName, codeScore, baseScore, linearData, isFullTime };
              });
              tRows.sort((a, b) => b.codeScore - a.codeScore);

              const requireCode = inputCodes.length > 0;
              const isValidGroup = (team: any[]) => {
                  if (!requireCode || team.length === 0) return true;
                  const withCodeCount = team.filter(t => t.baseScore > 0).length;
                  if (team.length === 1) return withCodeCount >= 1;
                  if (team.length === 2) return withCodeCount >= 1;
                  return withCodeCount > team.length / 2;
              };

              const findGroups = (reqP1Days: number, reqP2Days: number, labelPrefix: string) => {
                  for (let p1Start = minColIdx; p1Start < maxCols; p1Start++) {
                     const p1Cells = getCells(p1Start, reqP1Days);
                     if (p1Cells.length === 0 || p1Cells[p1Cells.length - 1] >= maxCols) break;
                     
                     const p2Earliest = p1Cells[p1Cells.length - 1] + 11;
                     for (let p2Start = p2Earliest; p2Start < maxCols; p2Start++) {
                        const p2Cells = getCells(p2Start, reqP2Days);
                        if (p2Cells.length === 0 || p2Cells[p2Cells.length - 1] >= maxCols) break;

                        const freeForP1 = tRows.filter(t => p1Cells.every(c => isEmpty(t.linearData[c])));
                        const freeForP2 = tRows.filter(t => p2Cells.every(c => isEmpty(t.linearData[c])));

                        if (freeForP1.length >= p1People && freeForP2.length >= p2People) {
                           const freeForBoth = freeForP1.filter(t => p2Cells.every(c => isEmpty(t.linearData[c])));
                           if (freeForBoth.length > 0) {
                              const lead = freeForBoth[0];
                              const otherP1 = freeForP1.filter(t => t.teacherIndex !== lead.teacherIndex);
                              const otherP2 = freeForP2.filter(t => t.teacherIndex !== lead.teacherIndex);
                              
                              if (p1People === 1 && otherP2.length >= p2People - 1) {
                                 if (lead.isFullTime || p2People === 1) {
                                    const group = [lead, ...otherP2.slice(0, p2People - 1)];
                                    if (isValidGroup([lead]) && isValidGroup(group)) {
                                       if (results.length >= 2000) return; // Prevent excessive searching
                                       results.push({
                                          globalIndex: resultIdx++,
                                          name: group.map((t, idx) => `${t.name}${idx === 0 ? '(主审)' : ''}${t.codeScore > 0 ? '(有代码)' : '(无代码)'}`).join('、'),
                                          teacherIndex: lead.teacherIndex,
                                          teacherIndices: group.map(t => t.teacherIndex),
                                          groupNames: group.map((t, idx) => `${t.name}${idx === 0 ? '(主审)' : ''}${t.codeScore > 0 ? '(有代码)' : '(无代码)'}`),
                                          solutionIndexInRow: 0,
                                          totalSolutionsInRow: 1,
                                          matchLevel: group.some(t => t.codeScore >= 10000) ? '⭐包含优先安排' : '多人排程方案',
                                          reason: `【${labelPrefix}】\n一阶段: ${formatDayRange(p1Start, p1Cells[p1Cells.length - 1])} (${reqP1Days}天/人，共${p1People}人)\n二阶段: ${formatDayRange(p2Start, p2Cells[p2Cells.length - 1])} (${reqP2Days}天/人，共${p2People}人)`,
                                          id: Math.random().toString(36).substring(2, 9),
                                          p1Cells: p1Cells,
                                          p2Cells: p2Cells,
                                          otherSchedulesInRow: [],
                                          p1TeacherIndices: [lead.teacherIndex],
                                          p2TeacherIndices: group.map(t => t.teacherIndex),
                                          _groupScore: group.reduce((sum, t) => sum + t.codeScore, 0)
                                       } as any);
                                    }
                                 }
                              } else if (otherP1.length >= p1People - 1 && otherP2.length >= p2People - 1) {
                                 const p1Group = [lead, ...otherP1.slice(0, p1People - 1)];
                                 const remainingPoolP2 = tRows.filter(t => t.teacherIndex !== lead.teacherIndex && p2Cells.every(c => isEmpty(t.linearData[c])));
                                 const p1OthersSet = new Set(p1Group.map(t => t.teacherIndex));
                                 const p2Pref = remainingPoolP2.filter(t => p1OthersSet.has(t.teacherIndex));
                                 const p2NonPref = remainingPoolP2.filter(t => !p1OthersSet.has(t.teacherIndex));
                                 
                                 let selectedForP2Others: any[] = [];
                                 
                                 if (!lead.isFullTime) {
                                     // 非专审：组员必须完全一致（人数如果不一致，说明肯定无法完全一致，所以也就匹配不到）
                                     if (p1People === p2People && p2Pref.length >= p2People - 1) {
                                         selectedForP2Others = p2Pref.slice(0, p2People - 1);
                                     }
                                 } else {
                                     // 专审：组长是专审，组员不用强制和一阶段一样，也就是一二阶段可以不一致
                                     selectedForP2Others = [...p2Pref, ...p2NonPref].slice(0, p2People - 1);
                                 }
                                 
                                 if (selectedForP2Others.length >= p2People - 1) {
                                     const p2Group = [lead, ...selectedForP2Others];
                                     const allInvolved = Array.from(new Set([...p1Group, ...p2Group]));
                                     
                                     if (isValidGroup(p1Group) && isValidGroup(p2Group)) {
                                         if (results.length >= 2000) return; // Prevent excessive searching
                                         results.push({
                                            globalIndex: resultIdx++,
                                            name: allInvolved.map((t, idx) => `${t.name}${idx === 0 ? '(主审)' : ''}${t.codeScore > 0 ? '(有代码)' : '(无代码)'}`).join('、'),
                                            teacherIndex: lead.teacherIndex,
                                            teacherIndices: allInvolved.map(t => t.teacherIndex),
                                            groupNames: allInvolved.map((t, idx) => `${t.name}${idx === 0 ? '(主审)' : ''}${t.codeScore > 0 ? '(有代码)' : '(无代码)'}`),
                                            solutionIndexInRow: 0,
                                            totalSolutionsInRow: 1,
                                            matchLevel: allInvolved.some(t => t.codeScore >= 10000) ? '⭐包含优先安排' : '多人排程方案',
                                            reason: `【${labelPrefix}】\n一阶段: ${formatDayRange(p1Start, p1Cells[p1Cells.length - 1])} (${reqP1Days}天/人，共${p1People}人)\n二阶段: ${formatDayRange(p2Start, p2Cells[p2Cells.length - 1])} (${reqP2Days}天/人，共${p2People}人)`,
                                            id: Math.random().toString(36).substring(2, 9),
                                            p1Cells: p1Cells,
                                            p2Cells: p2Cells,
                                            otherSchedulesInRow: [],
                                            p1TeacherIndices: p1Group.map(t => t.teacherIndex),
                                            p2TeacherIndices: p2Group.map(t => t.teacherIndex),
                                            _groupScore: allInvolved.reduce((sum, t) => sum + t.codeScore, 0)
                                         } as any);
                                     }
                                 }
                              }
                           }
                        }
                     }
                  }
               };

               findGroups(p1Days, p2Days, `一阶段${p1People}人，二阶段${p2People}人`);
               
               results.sort((a: any, b: any) => (b._groupScore || 0) - (a._groupScore || 0));
               results = results.slice(0, 50);
               results.forEach((r, idx) => { r.globalIndex = idx; });
            }
           
           setRecommendations(results);
           setActiveRecommendationIndex(0);
           setIsGenerating(false);
           if (onSuccess && results.length > 0) {
              onSuccess();
           }
        } catch (err: any) {
           console.error(err);
           setGenerateError("排程计算过程中发生错误: " + err.message);
           setIsGenerating(false);
        }
     }, 100);
  };

  return {
    schedParams,
    setSchedParams,
    activeRecommendationIndex,
    setActiveRecommendationIndex,
    generateError,
    setGenerateError,
    isGenerating,
    showRecommendations,
    setShowRecommendations,
    recommendations,
    handleGenerateSchedule
  };
}
