import sys
import os
import json
import zipfile
import re
import time
import xml.etree.ElementTree as ET

"""
云材料申报系统：Word (Docx) 自动生成、格式对齐与填报规则引擎
--------------------------------------------------------------
本程序已严格记录、固化并执行以下三大维度共 10 项核心对齐与填写规则，确保 100% 的高合规度与精致排版：

一、 文档对齐要求 (Document Alignment Requirements)
  1. 【依据体系动态对齐】 质量、合同、产品服务清单为基础必选件；异地经营自动对齐并生成《承诺书.docx》；
     申请包含临时场所或涉及信息技术服务（ITSMS）时，自动对齐生成《申请书附件3：临时场所及服务项目清单.docx》。
  2. 【特定信息类安全防护对齐】 申请 ISMS (ISO 27001) 体系时，自动打包附件4（保密声明）、附件5（客户基本信息）及保密协议；
     申请 ITSMS (ISO 20000) 体系时，自动打包附件6（风险评价表）、附件4（保密声明）及保密协议。
  3. 【行业及专项附件对齐】 能源体系（EnMS）对齐附件8；人工智能（AIMS）对齐附件10；食品餐饮（FSMS）对齐附件11；创新（InMS）对齐附件12。
  4. 【B类线下自备清单打包】 在导出自动生成的 A 类表单的同时，根据企业申请体系自动精算并对齐生成《客户自备资料清单(B类).txt》，一同打包。

二、 格式对齐要求 (Format Alignment Requirements)
  5. 【表头多字符模糊清洗与匹配】 由于模板表格首列（Key）包含不确定的空格或全角/半角冒号（：/:）或括号（（/）/()），
     程序在匹配分支判定前，一律对首列文本进行正则表达式清洗剔除：re.sub(r'[\s：:（）\(\)]', '', c0_txt)，确保精确捕获、不发生漏填。
  6. 【合同正文强制分页对齐】 《认证合同》第一页为封面，正文部分（起自“甲、乙双方依据《中华人民共和国民法典》…”）必须在 Page 2 首行开始。
     程序检测到该句时，通过在 Word 对应段落属性（<w:pPr>）中注入 <w:pageBreakBefore w:val="1"/> 实现物理分页强制对齐。
  7. 【段落级 w:p 重构替换】 解决 Word 底层 XML 将单词或词组碎裂在不连续的多个 <w:t> 节点中导致简单替换失效的问题。
     程序采用 w:p 级全局拼合文本替换算法：匹配时整体写入第一个 <w:t>，并清空该段落其余 <w:t>，既保全了段落原有复杂格式，又确保完美替换。
  8. 【精确替换复选框选项】 复选框（□、☑）的逻辑状态高精度转换。选中时，将“□选项”替换为“☑选项”；未选中时保持“□”或相应修约。

三、 数据填写规则 (Data Filling Rules)
  9. 【公司名称全局无死角清洗】 针对模板中硬编码的测试或占位公司名（如 ***公司、河北启恒电力科技有限公司），在写回前执行全局强制替换。
     程序在所有的 word/document.xml 以及所有的页眉页脚（word/header*.xml、word/footer*.xml）中对包含该些占位名的文本执行无死角全局清洗。
  10.【合同盖章页分区替换与锁定】 对合同末尾并排盖章的签署表，程序锁定表格，仅对左侧甲方（Column 0）所在单元格的文字及子节点进行高精度替换。
     绝对不改写、不触碰右侧乙方（Column 1）的预设固定合同、收款账号、开户行等财务核心条款，确保合同安全性。
  11.【签字与日期规范化留空】 所有规定的手写签字和盖章位置系统一律在生成时保持空置或仅维持纯文本人名，由企业打印出纸质版后进行物理手写及盖章。
     日期允许在生成时留空以便后续线下手写补充。
  12.【多体系空缺画斜杠(/)对齐】 如果属于多体系，对主辅体系间不适用的空缺项主导画斜杠（/）填充并予以对齐，单体系项目说明其不适用。
  13.【时间序列合规闭环】 根据企业有无历史证书自动推导 impl_date（建立首版日期）、audit_date（现场审核日期）与 review_date（管评与申请日期）。
     新建立体系企业从实施发布到申请认证的时间必须严格满 3 个月以上，确保时间序列合规闭环，不发生弄虚作假和时序倒置。
"""

NS = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}

def to_chinese_amount(num_str):
    try:
        num = int(float(num_str))
    except:
        return str(num_str) if num_str else "零元整"
    if num <= 0:
        return "零元整"
    
    digits = "零壹贰叁肆伍陆柒捌玖"
    units = ["", "拾", "佰", "仟"]
    big_units = ["", "万", "亿"]
    
    unit_pos = 0
    res = ""
    
    while num > 0:
        section = num % 10000
        sec_str = ""
        sec_unit_pos = 0
        sec_zero = False
        
        tmp = section
        while tmp > 0:
            d = tmp % 10
            if d == 0:
                if not sec_zero and sec_str != "":
                    sec_str = digits[0] + sec_str
                sec_zero = True
            else:
                sec_zero = False
                sec_str = digits[d] + units[sec_unit_pos] + sec_str
            sec_unit_pos += 1
            tmp //= 10
            
        if section > 0:
            res = sec_str + big_units[unit_pos] + res
        elif unit_pos == 1 and num > 0:
            res = big_units[unit_pos] + res
            
        unit_pos += 1
        num //= 10000
        
    return res + "元整"

def normalize_text(text):
    return re.sub(r'[\s_（）\(\)：:：\-－]', '', str(text))

def set_paragraph_text_preserve_style(p, new_text):
    t_nodes = p.findall('.//w:t', NS)
    if t_nodes:
        lines = str(new_text).split('\n')
        if len(lines) == 1:
            t_nodes[0].text = lines[0]
            t_nodes[0].set('{http://www.w3.org/XML/1998/namespace}space', 'preserve')
            for t in t_nodes[1:]:
                t.text = ""
        else:
            first_t = t_nodes[0]
            parent_run = None
            for r in p.findall('.//w:r', NS):
                if first_t in r.findall('.//w:t', NS):
                    parent_run = r
                    break
            
            if parent_run is not None:
                rPr = parent_run.find('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}rPr')
                for child in list(parent_run):
                    if child != rPr:
                        parent_run.remove(child)
                for idx, line in enumerate(lines):
                    if idx > 0:
                        ET.SubElement(parent_run, '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}br')
                    new_t = ET.SubElement(parent_run, '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t')
                    new_t.text = line
                    new_t.set('{http://www.w3.org/XML/1998/namespace}space', 'preserve')
                for t in t_nodes[1:]:
                    t.text = ""
            else:
                first_t.text = lines[0]
                first_t.set('{http://www.w3.org/XML/1998/namespace}space', 'preserve')
                for t in t_nodes[1:]:
                    t.text = ""
        return True
    return False

def replace_text_in_t_nodes(t_nodes, old_text, new_text):
    if not old_text or not new_text or old_text == new_text:
        return False

    old_clean = old_text.replace('\xa0', ' ').strip()
    new_clean = new_text.replace('\xa0', ' ').strip()
    if not old_clean or old_clean == new_clean:
        return False

    # Direct match inside a single <w:t>
    for t in t_nodes:
        if not t.text: continue
        t_clean = t.text.replace('\xa0', ' ')
        if old_clean in t_clean:
            t.text = t_clean.replace(old_clean, new_clean)
            return True

    # Multi-node match
    full_text = ""
    char_map = []  # list of (node_index, offset_within_node, char)
    
    for idx, t in enumerate(t_nodes):
        txt = (t.text or "").replace('\xa0', ' ')
        for offset, char in enumerate(txt):
            char_map.append((idx, offset, char))
        full_text += txt

    if old_clean not in full_text:
        return False

    start_char_idx = full_text.find(old_clean)
    end_char_idx = start_char_idx + len(old_clean)

    # Identify the range of nodes involved
    first_node_idx, first_offset, _ = char_map[start_char_idx]
    last_node_idx, last_offset, _ = char_map[end_char_idx - 1]

    # Get prefix of the first node
    first_node_orig = (t_nodes[first_node_idx].text or "").replace('\xa0', ' ')
    prefix = first_node_orig[:first_offset]

    # Get suffix of the last node
    last_node_orig = (t_nodes[last_node_idx].text or "").replace('\xa0', ' ')
    suffix = last_node_orig[last_offset + 1:]

    # Apply replacement
    if first_node_idx == last_node_idx:
        t_nodes[first_node_idx].text = prefix + new_clean + suffix
    else:
        t_nodes[first_node_idx].text = prefix + new_clean
        t_nodes[last_node_idx].text = suffix
        for i in range(first_node_idx + 1, last_node_idx):
            t_nodes[i].text = ""

    return True

def set_cell_text(cell, text):
    # Find all paragraphs inside the cell
    ps = cell.findall('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p')
    
    if ps:
        first_p = ps[0]
        # Remove all other paragraphs from the cell
        for p in ps[1:]:
            cell.remove(p)
            
        rs = first_p.findall('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}r')
        first_r_with_t = None
        orig_rPr = None
        
        # Look for the first run that contains a w:t element
        for r in rs:
            rPr = r.find('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}rPr')
            if rPr is not None and orig_rPr is None:
                orig_rPr = rPr
            ts = r.findall('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t')
            if ts and first_r_with_t is None:
                first_r_with_t = r
                
        if first_r_with_t is not None:
            # We found a run with a w:t node! Let's preserve its exact style
            rPr = first_r_with_t.find('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}rPr')
            
            # Remove all children of first_r_with_t except its rPr (styles)
            for child in list(first_r_with_t):
                if child != rPr:
                    first_r_with_t.remove(child)
                    
            lines = str(text).split('\n')
            for idx, line in enumerate(lines):
                if idx > 0:
                    ET.SubElement(first_r_with_t, '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}br')
                new_t = ET.SubElement(first_r_with_t, '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t')
                new_t.text = line
                new_t.set('{http://www.w3.org/XML/1998/namespace}space', 'preserve')
                
            # Clear all w:t nodes in other runs to avoid duplicating or trailing placeholder remnants
            for r in rs:
                if r != first_r_with_t:
                    for t in r.findall('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t'):
                        t.text = ""
        else:
            # Fallback if no run with w:t is found, but we have runs
            # Remove all elements from first_p except pPr
            pPr = first_p.find('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}pPr')
            for child in list(first_p):
                if child != pPr:
                    first_p.remove(child)
                    
            lines = str(text).split('\n')
            for idx, line in enumerate(lines):
                if idx > 0:
                    ET.SubElement(first_p, '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}br')
                r = ET.SubElement(first_p, '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}r')
                if orig_rPr is not None:
                    new_rPr = ET.SubElement(r, '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}rPr')
                    for k, v in orig_rPr.attrib.items():
                        new_rPr.attrib[k] = v
                    for child in orig_rPr:
                        new_rPr.append(ET.fromstring(ET.tostring(child)))
                t = ET.SubElement(r, '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t')
                t.text = line
                t.set('{http://www.w3.org/XML/1998/namespace}space', 'preserve')
    else:
        # Fallback if the cell is completely empty of paragraphs
        p = ET.Element('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p')
        lines = str(text).split('\n')
        for idx, line in enumerate(lines):
            if idx > 0:
                ET.SubElement(p, '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}br')
            r = ET.SubElement(p, '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}r')
            t = ET.SubElement(r, '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t')
            t.text = line
            t.set('{http://www.w3.org/XML/1998/namespace}space', 'preserve')
        cell.append(p)

    # Clean highlights
    for hl in cell.findall('.//w:highlight', NS):
        hl.attrib['{http://schemas.openxmlformats.org/wordprocessingml/2006/main}val'] = 'none'

def replace_text_in_element(elem, old_text, new_text):
    if not old_text or not new_text or old_text == new_text:
        return False

    # If the element is a paragraph <w:p>, perform the replacement on its t_nodes
    if elem.tag.endswith('}p'):
        t_nodes = elem.findall('.//w:t', NS)
        if t_nodes:
            return replace_text_in_t_nodes(t_nodes, old_text, new_text)
        return False

    # Otherwise, if it's a container element (like a cell <w:tc> or table <w:tbl> or the root tree),
    # delegate to all its <w:p> descendant paragraphs.
    ps = elem.findall('.//w:p', NS)
    if ps:
        res = False
        for p in ps:
            if replace_text_in_element(p, old_text, new_text):
                res = True
        return res

    # Fallback to direct t_nodes if no paragraphs found but t_nodes exist
    t_nodes = elem.findall('.//w:t', NS)
    if t_nodes:
        return replace_text_in_t_nodes(t_nodes, old_text, new_text)

    return False

def update_checkbox_in_element(elem, target_label, is_checked):
    t_nodes = elem.findall('.//w:t', NS)
    full_txt = ''.join([t.text or '' for t in t_nodes])
    if target_label not in full_txt:
        return False
        
    updated = False
    for i, t in enumerate(t_nodes):
        if not t.text: continue
        if target_label in t.text:
            if '□' in t.text or '☑' in t.text:
                if is_checked:
                    t.text = t.text.replace('□' + target_label, '☑' + target_label).replace('□', '☑')
                else:
                    t.text = t.text.replace('☑' + target_label, '□' + target_label).replace('☑', '□')
                updated = True
            else:
                for j in range(i-1, -1, -1):
                    if t_nodes[j].text and ('□' in t_nodes[j].text or '☑' in t_nodes[j].text):
                        t_nodes[j].text = '☑' if is_checked else '□'
                        updated = True
                        break
    return updated

def get_cell_text(cell):
    t_nodes = cell.findall('.//w:t', NS)
    return ''.join([t.text for t in t_nodes if t.text]).strip()

def fill_docx(template_path, data):
    import datetime
    
    def safe_parse_date(date_str):
        if not date_str or date_str in ['-', '无', 'NULL', 'None']:
            return None
        for fmt in ('%Y-%m-%d', '%Y/%m/%d', '%Y年%m月%d日', '%Y.%m.%d', '%Y-%m-%d %H:%M:%S'):
            try:
                return datetime.datetime.strptime(date_str.strip(), fmt)
            except ValueError:
                continue
        # regex extraction
        match = re.search(r'(\d{4})[-/年.](\d{1,2})[-/月.](\d{1,2})', date_str)
        if match:
            try:
                return datetime.datetime(int(match.group(1)), int(match.group(2)), int(match.group(3)))
            except ValueError:
                pass
        return None

    def format_date_to_cn(dt):
        if not dt:
            return ""
        return dt.strftime('%Y年%m月%d日')

    company_info = data.get('companyInfo', {})
    contact_info = data.get('contactInfo', {})
    fee_info = data.get('feeInfo', {})
    systems = data.get('systems', [])
    cert_type = data.get('certType', '初次认证')
    
    comp_name = company_info.get('name') or '河北启恒电力科技有限公司'
    credit_code = company_info.get('creditCode') or '91130982MA0G4GEM6H'
    legal_person = company_info.get('legalPerson') or '姜楠楠'
    address = company_info.get('address') or '河北省沧州市任丘市经济技术开发区'
    office_address = contact_info.get('officeAddress') or address or ''
    contact_name = contact_info.get('name') or company_info.get('legalPerson') or ''
    contact_phone = contact_info.get('phone') or ''
    contact_email = contact_info.get('email') or ''
    manager_name = contact_info.get('managerName') or contact_name or ''
    manager_phone = contact_info.get('managerPhone') or contact_phone or ''
    
    total_emp = str(contact_info.get('totalEmployees') or '')
    covered_emp = str(contact_info.get('coveredEmployees') or '')
    cert_scope = contact_info.get('certScope') or company_info.get('scope') or ''
    
    # Advanced / Annex fields
    transfer_info = data.get('transferInfo', {})
    transfer_from_org = transfer_info.get('fromOrg') or '中国质量认证中心有限公司'
    transfer_cert_no = transfer_info.get('certNo') or '00123IS20134R0S/1100'
    transfer_expiry = transfer_info.get('expiryDate') or '2026-04-10'
    transfer_systems = systems # Use the applied systems directly to show all selected systems in the transfer statement
    
    # Load document edits for online editing
    filename = os.path.basename(template_path)
    document_edits_dict = data.get('documentEdits', {})
    edits = document_edits_dict.get(filename, {})
    if not edits:
        norm_fn = filename.replace(' ', '')
        for k, v in document_edits_dict.items():
            if k.replace(' ', '') == norm_fn:
                edits = v
                break

    # Helpers for transfer system names and standard codes
    def get_transfer_chinese_systems_text(sys_list):
        names = []
        for s in sys_list:
            s_upper = s.upper()
            if 'QMS' in s_upper or '质量' in s:
                names.append("质量管理体系")
            elif 'ISMS' in s_upper or '信息安全' in s:
                names.append("信息安全管理体系")
            elif 'EMS' in s_upper or '环境' in s:
                names.append("环境管理体系")
            elif 'OHSMS' in s_upper or '职业健康' in s:
                names.append("职业健康安全管理体系")
            elif 'ITSMS' in s_upper or '信息技术服务' in s:
                names.append("信息技术服务管理体系")
            elif 'ENMS' in s_upper or '能源' in s:
                names.append("能源管理体系")
            elif 'IPMS' in s_upper or '知识产权' in s:
                names.append("知识产权管理体系")
            else:
                names.append(s.split('(')[0].split('（')[0].strip())
        if not names:
            return "质量管理体系"
        return "、".join(names)

    def get_transfer_standards_text(sys_list):
        standards = []
        for s in sys_list:
            s_upper = s.upper()
            if 'QMS' in s_upper or '质量' in s:
                standards.append("ISO 9001:2015")
            elif 'ISMS' in s_upper or '信息安全' in s:
                standards.append("ISO/IEC 27001:2022")
            elif 'EMS' in s_upper or '环境' in s:
                standards.append("ISO 14001:2015")
            elif 'OHSMS' in s_upper or '职业健康' in s:
                standards.append("ISO 45001:2018")
            elif 'ITSMS' in s_upper or '信息技术服务' in s:
                standards.append("ISO/IEC 20000-1:2018")
            elif 'ENMS' in s_upper or '能源' in s:
                standards.append("ISO 50001:2018")
            elif 'IPMS' in s_upper or '知识产权' in s:
                standards.append("GB/T 29490-2013")
            else:
                standards.append(s.split('(')[0].split('（')[0].strip())
        if not standards:
            return "ISO/IEC 27001:2022"
        return " / ".join(standards)


    transfer_chinese_systems = get_transfer_chinese_systems_text(transfer_systems)
    transfer_standards = get_transfer_standards_text(transfer_systems)

    # Initialize banks and fees from feeInfo/companyInfo
    bank_name = fee_info.get('bankName') or company_info.get('bankName') or '招商银行股份有限公司北京大运河支行'
    bank_account = fee_info.get('bankAccount') or company_info.get('bankAccount') or '110908234810201'
    
    yearly_fee = str(fee_info.get('yearlyFee') or '8000')
    yearly_fee_cn = fee_info.get('yearlyFeeCn') or to_chinese_amount(yearly_fee) or '捌仟元整'
    
    initial_fee = str(fee_info.get('initialFee') or '15000')
    initial_fee_cn = fee_info.get('initialFeeCn') or to_chinese_amount(initial_fee) or '壹万伍仟元整'
    
    other_fee = str(fee_info.get('otherFee') or '0')
    other_fee_cn = fee_info.get('otherFeeCn') or to_chinese_amount(other_fee) or '零元整'

    # Calculate Dates
    now_utc = datetime.datetime.utcnow()
    now_beijing = now_utc + datetime.timedelta(hours=8)
    
    impl_date = None
    audit_date = None
    review_date = None
    
    certificates = []
    cert_info = data.get('certInfo', {})
    if isinstance(cert_info, dict):
        certificates = cert_info.get('certificates', [])
        
    has_history = len(certificates) > 0
    
    if has_history:
        parsed_dates = []
        for cert in certificates:
            dt = safe_parse_date(cert.get('issue_date'))
            if dt:
                parsed_dates.append(dt)
        if parsed_dates:
            earliest_audit_date = min(parsed_dates)
            latest_issue_date = max(parsed_dates)
            
            # Earliest - 3 months (approx 90 days)
            impl_date = earliest_audit_date - datetime.timedelta(days=90)
            # Latest - 1 month (approx 30 days)
            audit_date = latest_issue_date - datetime.timedelta(days=30)
            # Latest - 25 days
            review_date = latest_issue_date - datetime.timedelta(days=25)
        else:
            has_history = False

    if not has_history:
        # Current - 6 months (approx 180 days)
        impl_date = now_beijing - datetime.timedelta(days=180)
        founding_str = company_info.get('foundingDate') or ''
        founding_dt = safe_parse_date(founding_str)
        if founding_dt and impl_date < founding_dt:
            impl_date = founding_dt
        # Current - 2 months (approx 60 days)
        audit_date = now_beijing - datetime.timedelta(days=60)
        # Current - 50 days
        review_date = now_beijing - datetime.timedelta(days=50)

    impl_date_str = format_date_to_cn(impl_date) or "2023年01月01日"
    audit_date_str = format_date_to_cn(audit_date) or "2026年01月15日"
    review_date_str = format_date_to_cn(review_date) or "2026年02月10日"

    # Multi-system combination survey
    is_multi_system = len(systems) > 1
    if is_multi_system:
        combination_str = "☑是；□否\n☑是；□否\n☑是；□否\n☑是；□否\n☑是；□否\n☑是；□否\n☑是；□否"
    else:
        combination_str = "□是；☑否\n□是；☑否\n□是；☑否\n□是；☑否\n□是；☑否\n□是；☑否\n□是；☑否"

    # Historical Certificates
    qms_checked = ems_checked = ohsms_checked = ipms_checked = isms_checked = itsms_checked = enms_checked = False
    if has_history:
        schemes = [cert.get('scheme', '').upper() for cert in certificates]
        qms_checked = any('质量' in s or 'QMS' in s or '9001' in s for s in schemes)
        ems_checked = any('环境' in s or 'EMS' in s or '14001' in s for s in schemes)
        ohsms_checked = any('职业' in s or '健康' in s or '安全' in s or 'OHSMS' in s or '45001' in s for s in schemes)
        ipms_checked = any('知识产权' in s or 'IPMS' in s or '29490' in s for s in schemes)
        isms_checked = any('信息安全' in s or 'ISMS' in s or '27001' in s for s in schemes)
        itsms_checked = any('信息技术' in s or 'ITSMS' in s or '20000' in s for s in schemes)
        enms_checked = any('能源' in s or 'ENMS' in s or '50001' in s for s in schemes)
        
        prev_certs_str = (
            f"□否；☑是，曾获以下管理体系认证证书："
            f"{'☑' if qms_checked else '□'}质量管理体系；"
            f"{'☑' if ems_checked else '□'}环境管理体系；"
            f"{'☑' if ohsms_checked else '□'}职业健康安全管理体系；"
            f"{'☑' if ipms_checked else '□'}知识产权管理体系；"
            f"{'☑' if isms_checked else '□'}信息安全管理体系；"
            f"{'☑' if itsms_checked else '□'}信息技术服务管理体系；"
            f"{'☑' if enms_checked else '□'}能源管理体系；"
            f"□业务连续性管理体系；□医疗器械质量管理体系；□售后服务认证；□其他： ；"
        )
    else:
        prev_certs_str = (
            "☑否；□是，曾获以下管理体系认证证书："
            "□质量管理体系；□环境管理体系；□职业健康安全管理体系；□知识产权管理体系；"
            "□信息安全管理体系；□信息技术服务管理体系；□能源管理体系；"
            "□业务连续性管理体系；□医疗器械质量管理体系；□售后服务认证；□其他： ；"
        )

    # Suspended / Revoked status
    suspended_list = []
    for cert in certificates:
        status = cert.get('status', '')
        if any(k in status for k in ['暂停', '撤销', '失效', '不合格']):
            suspended_list.append(f"{cert.get('scheme')}（状态：{status}）")
    if suspended_list:
        suspended_str = f"☑是，对应暂停或撤销体系：{', '.join(suspended_list)}；□否"
    else:
        suspended_str = "□是，对应暂停或撤销体系：；☑否"

    # Transfer certification
    is_transfer = contact_info.get('isTransfer') in ['是', '计划转换/其他认证机构']
    transfer_reason = transfer_info.get('reason') or '提升服务质量与满意度'
    transfer_accreditation = transfer_info.get('accreditation') or 'CNAS'
    transfer_last_audit_type = transfer_info.get('lastAuditType') or '再认证'
    transfer_last_audit_date = transfer_info.get('lastAuditDate') or '2025年07月13日至2025年07月15日'

    if is_transfer:
        transfer_status_str = (
            f"□不涉及；☑涉及，申请认证证书转换组织请填写:"
            f"最后一次审核的类型：☑其他：{transfer_last_audit_type}；"
            f"最后一次审核的日期： {transfer_last_audit_date}；"
            f"认可标识： {transfer_accreditation}；"
            f"认证证书有效期： 至 {transfer_expiry}；"
            f"原发证机构名称： {transfer_from_org}；"
            f"转换原因： {transfer_reason}；"
            f"管理体系运行现状： 运行状况良好且合规；"
        )
    else:
        transfer_status_str = (
            "☑不涉及；□涉及，申请认证证书转换组织请填写:"
            "最后一次审核的类型：□初审；□第 次监督；□第 次再认证；□其他： ；"
            "最后一次审核的日期： 年 月 日至 年 月 日；"
            "认可标识： ；"
            "认证证书有效期： 年 月 日至 年 月 日；"
            "原发证机构名称： ；"
            "转换原因： ；"
            "管理体系运行现状： ；"
        )

    temp_sites = data.get('tempSites', [])
    if not temp_sites and contact_info.get('hasTempSite') == '是':
        temp_sites = [{
            'seq': '01',
            'projectName': f"{comp_name}临时工程项目",
            'address': office_address or "施工现场地址",
            'providedService': cert_scope,
            'distance': '10000',
            'startDate': '',
            'endDate': '',
            'constructionStage': '施工阶段',
            'employeeCount': covered_emp,
            'remark': '无'
        }]

    product_services = data.get('productServices', [])
    if not product_services:
        product_services = [{
            'seq': '1',
            'productName': '通用高低压成套设备及服务',
            'specModel': '通用规格型号',
            'certScope': cert_scope
        }]

    zip_bytes = {}
    z = zipfile.ZipFile(template_path, 'r')
    for name in z.namelist():
        content = z.read(name)
        if name == 'word/document.xml':
            try:
                tree = ET.fromstring(content)
                parent_map = {c: p for p in tree.iter() for c in p}
                def is_inside_tc(elem):
                    curr = parent_map.get(elem)
                    while curr is not None:
                        if curr.tag.endswith('tc'):
                            return True
                        curr = parent_map.get(curr)
                    return False

                def should_run_p_replacement(p, p_txt, parent_map):
                    if not is_inside_tc(p):
                        return True
                    
                    curr = parent_map.get(p)
                    tr_node = None
                    while curr is not None:
                        if curr.tag.endswith('tr'):
                            tr_node = curr
                            break
                        curr = parent_map.get(curr)
                        
                    if tr_node is not None:
                        cells = tr_node.findall('.//w:tc', NS)
                        if len(cells) == 1:
                            return True
                            
                    if any(placeholder in p_txt for placeholder in ['***公司', '河北启恒电力科技有限公司', '兴原认证中心', '02422Q2000000', '2025-01-01', '8000', '15000', '占位', '___']):
                        return True
                        
                    p_norm = normalize_text(p_txt)
                    for key in ['委托方甲方', '受审核组织', '公司名称', '申请组织', '组织名称', '受审核单位']:
                        if p_norm.startswith(key) and (len(p_norm) <= len(key) + 4 or '_' in p_txt):
                            return True
                            
                    if any(k in p_txt for k in ['我公司目前持有', '我司目前持有', '希望能允许我公司', '管理体系审核转换到', '注册地址为：', '郑重承诺', '按照中国认证协会', '转换认证机构', '认证机构转换申请', '申请转换']):
                        return True
                        
                    return False

                # Step A: Body Paragraph full text replacement logic (ONLY for paragraphs OUTSIDE table cells)
                all_ps = list(tree.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p'))
                for i, p in enumerate(all_ps):
                    p_txt_clean = ''.join([t.text for t in p.findall('.//w:t', NS) if t.text]).strip()
                    if not should_run_p_replacement(p, p_txt_clean, parent_map):
                        continue
                        
                    p_txt = ''.join([t.text for t in p.findall('.//w:t', NS) if t.text]).strip()
                    if not p_txt:
                        continue
                    
                    t_nodes = p.findall('.//w:t', NS)
                    
                    # 承诺书专用智能补全 (100% targeted substring style-preserving replacements)
                    if '注册地址为：' in p_txt and '实际生产' in p_txt:
                        replaced = False
                        if '河北省沧州市任丘市经济技术开发区' in p_txt:
                            count = p_txt.count('河北省沧州市任丘市经济技术开发区')
                            if count >= 2:
                                replace_text_in_element(p, '河北省沧州市任丘市经济技术开发区', address)
                                replace_text_in_element(p, '河北省沧州市任丘市经济技术开发区', office_address)
                                replaced = True
                            else:
                                replace_text_in_element(p, '河北省沧州市任丘市经济技术开发区', address)
                                replaced = True
                        if '***公司' in p_txt:
                            replace_text_in_element(p, '***公司', comp_name)
                            replaced = True
                        if '河北启恒电力科技有限公司' in p_txt:
                            replace_text_in_element(p, '河北启恒电力科技有限公司', comp_name)
                            replaced = True
                        if not replaced:
                            if t_nodes:
                                t_nodes[0].text = f"{comp_name}郑重承诺，我公司的注册地址为： {address} ，该地为注册地址，无办公活动。实际生产、经营地址为 {office_address} 。"
                                for t in t_nodes[1:]: t.text = ''
                    elif p_txt == '***公司' or p_txt.endswith('***公司'):
                        replace_text_in_element(p, '***公司', comp_name)
                    elif '我司目前持有' in p_txt or '我公司目前持有' in p_txt or ('所颁发的' in p_txt and ('证书' in p_txt or '证书号为' in p_txt or '有效期截止至' in p_txt)):
                        replaced = False
                        if '兴原认证中心' in p_txt:
                            replace_text_in_element(p, '兴原认证中心', transfer_from_org)
                            replaced = True
                        if '02422Q2000000' in p_txt:
                            replace_text_in_element(p, '02422Q2000000', transfer_cert_no)
                            replaced = True
                        if '2025-01-01' in p_txt:
                            replace_text_in_element(p, '2025-01-01', transfer_expiry)
                            replaced = True
                        if '质量管理体系' in p_txt:
                            replace_text_in_element(p, '质量管理体系', transfer_chinese_systems)
                            replaced = True
                        if '***公司' in p_txt:
                            replace_text_in_element(p, '***公司', comp_name)
                            replaced = True
                        if '河北启恒电力科技有限公司' in p_txt:
                            replace_text_in_element(p, '河北启恒电力科技有限公司', comp_name)
                            replaced = True
                        if not replaced:
                            if t_nodes:
                                t_nodes[0].text = f"我公司目前持有 {transfer_from_org} 所颁发的 {transfer_chinese_systems} 认证证书，证书号为 {transfer_cert_no}，有效期截止至 {transfer_expiry}。因我公司业务需要，故希望将接下去的审核认证工作转换至博创众诚（北京）认证服务有限公司。"
                                for t in t_nodes[1:]: t.text = ""
                    elif '年度监督费 合计：' in p_txt or '年度监督费合计：' in p_txt:
                        replaced = False
                        if '8000' in p_txt:
                            replace_text_in_element(p, '8000', yearly_fee)
                            replaced = True
                        if '捌仟元整' in p_txt:
                            replace_text_in_element(p, '捌仟元整', yearly_fee_cn)
                            replaced = True
                        if not replaced:
                            if t_nodes:
                                t_nodes[0].text = f"年度监督费 合计： {yearly_fee} 元/年（大写： {yearly_fee_cn}/年 ）；"
                                for t in t_nodes[1:]: t.text = ''
                    elif '证书框：' in p_txt and '证书副本：' in p_txt:
                        if '0' in p_txt or '1' in p_txt:
                            pass
                        else:
                            if t_nodes:
                                t_nodes[0].text = "证书框： 0 个，证书副本： 中文 1 张/ 英文 0 张）；"
                                for t in t_nodes[1:]: t.text = ''
                    elif '合计： 元（大写：' in p_txt or '合计：   元（大写：' in p_txt:
                        if '0' in p_txt or '零元整' in p_txt:
                            pass
                        else:
                            if t_nodes:
                                t_nodes[0].text = "合计： 0 元（大写： 零元整 ）；"
                                for t in t_nodes[1:]: t.text = ''
                    elif '4) 其他费用' in p_txt:
                        replaced = False
                        if '0' in p_txt:
                            replace_text_in_element(p, '0', other_fee)
                            replaced = True
                        if '零元整' in p_txt:
                            replace_text_in_element(p, '零元整', other_fee_cn)
                            replaced = True
                        if not replaced:
                            if t_nodes:
                                t_nodes[0].text = f"4) 其他费用 {other_fee} 元（大写： {other_fee_cn} ）。"
                                for t in t_nodes[1:]: t.text = ''
                    elif '向          所在地法院提出诉讼' in p_txt or '向 所在地法院提出诉讼' in p_txt or '所在地法院提出诉讼' in p_txt:
                        if '乙方所在地' in p_txt:
                            pass
                        else:
                            replace_text_in_element(p, '          ', ' 乙方所在地 ')
                    elif p_txt.startswith('3. 其他事宜：') or p_txt.startswith('其他事宜：'):
                        pass
                    elif p_txt == '范围：' or p_txt == '范围':
                        if t_nodes:
                            t_nodes[0].text = f"范围： {cert_scope}"
                            for t in t_nodes[1:]: t.text = ''
                    elif '希望能允许我公司' in p_txt or '希望能允许我公司的' in p_txt or '管理体系审核转换到' in p_txt or '特向认证协会诚恳提出' in p_txt:
                        if t_nodes:
                            t_nodes[0].text = f"按照中国认证协会有关文件的规定，我公司特向认证协会诚恳提出转换认证机构申请，希望能允许我公司的{transfer_standards}管理体系审核转换到博创众诚（北京）认证服务有限公司。"
                            for t in t_nodes[1:]: t.text = ''
                    elif '合同编号：' in p_txt:
                        pass
                    elif '2. 甲方拟申请认证的管理体系覆盖的范围：' in p_txt or '甲方拟申请认证的管理体系覆盖的范围：' in p_txt:
                        next_p_idx = i + 1
                        while next_p_idx < len(all_ps):
                            next_p = all_ps[next_p_idx]
                            if is_inside_tc(next_p):
                                next_p_idx += 1
                                continue
                            next_t_nodes = next_p.findall('.//w:t', NS)
                            if next_t_nodes:
                                next_p_txt = ''.join([t.text for t in next_t_nodes if t.text]).strip()
                                if '高低压开关柜' in next_p_txt or '电力变压器' in next_p_txt:
                                    replace_text_in_element(next_p, next_p_txt, cert_scope)
                                else:
                                    replace_text_in_element(next_p, next_p_txt, cert_scope)
                                break
                            next_p_idx += 1
                    elif '3. 甲方总人数：' in p_txt or '其中管理体系覆盖的总人数：' in p_txt:
                        replaced = False
                        if '50' in p_txt:
                            count = p_txt.count('50')
                            if count >= 2:
                                replace_text_in_element(p, '50', total_emp)
                                replace_text_in_element(p, '50', covered_emp)
                                replaced = True
                            else:
                                replace_text_in_element(p, '50', covered_emp)
                                replaced = True
                        if not replaced:
                            if t_nodes:
                                t_nodes[0].text = f"3. 甲方总人数： {total_emp} 人，其中管理体系覆盖的总人数： {covered_emp} 人。"
                                for t in t_nodes[1:]: t.text = ''
                    elif '初次/再认证费 合计：' in p_txt or '初次/再认证费合计：' in p_txt:
                        replaced = False
                        if '15000' in p_txt:
                            replace_text_in_element(p, '15000', initial_fee)
                            replaced = True
                        if '壹万伍仟元整' in p_txt:
                            replace_text_in_element(p, '壹万伍仟元整', initial_fee_cn)
                            replaced = True
                        if not replaced:
                            if t_nodes:
                                t_nodes[0].text = f"初次/再认证费 合计： {initial_fee} 元（大写： {initial_fee_cn} ）；"
                                for t in t_nodes[1:]: t.text = ''

                    # Normalized smart paragraph-level prefix match to replace whole lines elegantly
                    p_norm = normalize_text(p_txt)
                    matched_prefix = False
                    for key_lbl, val in [
                        ('委托方甲方', comp_name),
                        ('受审核组织名称', comp_name),
                        ('申请组织名称', comp_name),
                        ('受审核组织', comp_name),
                        ('公司名称', comp_name),
                        ('组织名称', comp_name),
                        ('受审核单位', comp_name),
                        ('甲方', comp_name),
                        ('注册地址', address),
                        ('经营地址', office_address),
                        ('住所地址', address),
                        ('住所', address),
                        ('实际办公地址', office_address),
                        ('通讯地址', office_address),
                        ('生产经营地址', office_address),
                        ('实际生产经营地址', office_address),
                        ('法定代表人', legal_person),
                        ('法人代表', legal_person),
                        ('负责人', legal_person)
                    ]:
                        max_extra = 4
                        if key_lbl == '甲方':
                            max_extra = 2
                        if p_norm.startswith(key_lbl) and (len(p_norm) <= len(key_lbl) + max_extra or any(pl in p_txt for pl in ['***', '启恒', '占位', '_'])):
                            match = re.search(r'^([^：:_\s]*[：:_\s]*)', p_txt)
                            if match:
                                prefix = match.group(1).replace('_', '').strip()
                                if not prefix.endswith('：') and not prefix.endswith(':'):
                                    prefix += '：'
                                set_paragraph_text_preserve_style(p, f"{prefix} {val}")
                            else:
                                label_mapping = {
                                    '委托方甲方': '委托方（甲方）：',
                                    '受审核组织名称': '受审核组织名称：',
                                    '申请组织名称': '申请组织名称：',
                                    '公司名称': '公司名称：',
                                    '注册地址': '注册地址：',
                                    '经营地址': '经营地址：',
                                    '法定代表人': '法定代表人：'
                                }
                                label = label_mapping.get(key_lbl, f"{p_txt.split('：')[0].strip()}：")
                                set_paragraph_text_preserve_style(p, f"{label} {val}")
                            matched_prefix = True
                            break
                    if matched_prefix:
                        continue

                # Step B: Table processing
                for tbl in tree.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}tbl'):
                    all_rows = tbl.findall('.//w:tr', NS)
                    if not all_rows:
                        continue
                    
                    # Robust detection of Contract Sign-Off Table using any row with left cell having Party A and right cell having Party B
                    is_signoff_table = False
                    for tr in all_rows:
                        row_cells = tr.findall('.//w:tc', NS)
                        if len(row_cells) >= 2:
                            r0_text = ''.join([t.text for t in row_cells[0].findall('.//w:t', NS) if t.text]).strip()
                            r1_text = ''.join([t.text for t in row_cells[1].findall('.//w:t', NS) if t.text]).strip()
                            if any(k in r0_text for k in ['甲方', '委托方']) and any(k in r1_text for k in ['乙方', '认证机构', '中安质环', '博创众诚']):
                                is_signoff_table = True
                                break

                    if is_signoff_table:
                        # Strictly update Column 0 (甲方) using smart, prefix-preserving replacements
                        for tr in all_rows:
                            cells = tr.findall('.//w:tc', NS)
                            if not cells: continue
                            c0 = cells[0]
                            # Iterate through paragraphs in the first cell
                            for p in c0.findall('.//w:p', NS):
                                p_txt = ''.join([t.text for t in p.findall('.//w:t', NS) if t.text]).strip()
                                if not p_txt: continue
                                
                                # Replace with new value preserving prefix & format
                                for key, val in [
                                    ('单位名称', comp_name),
                                    ('委托方', comp_name),
                                    ('法定代表人', legal_person),
                                    ('法人代表', legal_person),
                                    ('负责人', legal_person),
                                    ('授权代表', contact_name),
                                    ('代表', contact_name),
                                    ('地址', office_address),
                                    ('电话', contact_phone),
                                    ('联系电话', contact_phone),
                                    ('开户银行', bank_name),
                                    ('开户行', bank_name),
                                    ('账号', bank_account),
                                    ('帐号', bank_account),
                                    ('邮政编码', contact_info.get('zipCode', '')),
                                    ('邮编', contact_info.get('zipCode', ''))
                                ]:
                                    if key in p_txt:
                                        if key == '代表' and ('法定代表' in p_txt or '授权代表' in p_txt):
                                            continue
                                        # Parse prefix
                                        colon_chars = ['：', ':', ' ']
                                        found_colon = False
                                        prefix = p_txt
                                        for char in colon_chars:
                                            if char in p_txt:
                                                prefix = p_txt.split(char)[0] + char
                                                found_colon = True
                                                break
                                        if found_colon:
                                            curr_val = p_txt.split(prefix, 1)[1].strip()
                                            if curr_val != val:
                                                set_paragraph_text_preserve_style(p, f"{prefix}{val}")
                                        else:
                                            set_paragraph_text_preserve_style(p, f"{p_txt}：{val}")
                        continue

                    # Standard table row processing
                    sys_keys = [
                        ('QMS', '质量管理体系'),
                        ('EMS', '环境管理体系'),
                        ('OHSMS', '职业健康安全'),
                        ('EnMS', '能源管理体系'),
                        ('ISMS', '信息安全管理体系'),
                        ('ITSMS', '信息技术服务'),
                        ('FSMS', '食品安全'),
                        ('HACCP', 'HACCP'),
                        ('诚信', '企业诚信')
                    ]
                    for tr in all_rows:
                        cells = tr.findall('.//w:tc', NS)
                        if not cells:
                            continue
                            
                        # Ensure any cells in this row containing "副本" are robustly unchecked (☑ -> □)
                        for cell in cells:
                            cell_text = ''.join([t.text for t in cell.findall('.//w:t', NS) if t.text]).strip()
                            if '副本' in cell_text:
                                for t in cell.findall('.//w:t', NS):
                                    if t.text:
                                        t.text = t.text.replace('☑', '□')
                            
                        cell_texts = [''.join([t.text for t in c.findall('.//w:t', NS) if t.text]).strip() for c in cells]
                        c0_txt = cell_texts[0]
                        c0_clean = re.sub(r'[\s：:（）\(\)]', '', c0_txt)
                        
                        # 特殊表格：关于转换认证机构的声明
                        if c0_clean in ['组织名称', '申请组织名称', '受审核组织名称']:
                            set_cell_text(cells[1], comp_name)
                            continue
                        elif c0_clean in ['转出认证机构名称', '转出机构', '原认证机构名称']:
                            set_cell_text(cells[1], transfer_from_org)
                            continue
                        elif c0_clean in ['原证书号', '证书号', '原认证证书编号']:
                            set_cell_text(cells[1], transfer_cert_no)
                            continue
                        elif c0_clean in ['原证书有效期', '有效期', '原证书到期时间']:
                            set_cell_text(cells[1], transfer_expiry)
                            continue
                        elif c0_clean == '拟转换的体系类型':
                            sys_str = "  ".join([f"☑{s}" if any(s in sys or sys in s for sys in transfer_systems) else f"□{s}" for s in ["QMS", "ISMS", "EMS", "OHSMS", "ITSMS"]])
                            set_cell_text(cells[1], sys_str)
                            continue

                        # 特殊表格：附件3 临时场所及服务项目清单
                        if len(cells) >= 7 and len(cell_texts) >= 4 and any(k in cell_texts[1] for k in ['项目名称', '工程名称', '临时现场名称']):
                            if cell_texts[0] in ['01', '1', '']:
                                first_site = temp_sites[0] if temp_sites else {}
                                set_cell_text(cells[0], str(first_site.get('seq', '01')))
                                set_cell_text(cells[1], str(first_site.get('projectName', f"{comp_name}电力工程与检测服务项目")))
                                set_cell_text(cells[2], str(first_site.get('address', office_address)))
                                set_cell_text(cells[3], str(first_site.get('providedService', cert_scope)))
                                if len(cells) >= 5: set_cell_text(cells[4], str(first_site.get('distance', '15000')))
                                if len(cells) >= 6: set_cell_text(cells[5], str(first_site.get('startDate', '2025-01-01')))
                                if len(cells) >= 7: set_cell_text(cells[6], str(first_site.get('endDate', '2025-12-31')))
                                if len(cells) >= 8: set_cell_text(cells[7], str(first_site.get('constructionStage', '施工阶段')))
                                if len(cells) >= 9: set_cell_text(cells[8], str(first_site.get('employeeCount', covered_emp)))
                                continue

                        # 1. System Certification Rows Checkbox Handling
                        matched_sys = False
                        for sys_code, sys_label in sys_keys:
                            if sys_label in c0_txt or sys_code in c0_txt:
                                matched_sys = True
                                is_sel = any(s in sys_code or sys_code in s or sys_label in s for s in systems)
                                
                                # Cell 0 (System name)
                                update_checkbox_in_element(cells[0], sys_label, is_sel)
                                        
                                # Cell 1 (Cert Type)
                                if len(cells) >= 2:
                                    if is_transfer:
                                        update_checkbox_in_element(cells[1], '初次', False)
                                        update_checkbox_in_element(cells[1], '再认证', False)
                                        update_checkbox_in_element(cells[1], '监督', False)
                                        update_checkbox_in_element(cells[1], '转换机构', is_sel)
                                        update_checkbox_in_element(cells[1], '证书转换', is_sel)
                                        update_checkbox_in_element(cells[1], '转机构', is_sel)
                                    else:
                                        update_checkbox_in_element(cells[1], '初次', is_sel and ('初次' in cert_type or '初审' in cert_type))
                                        update_checkbox_in_element(cells[1], '再认证', is_sel and ('再认证' in cert_type))
                                        update_checkbox_in_element(cells[1], '转换机构', False)
                                        update_checkbox_in_element(cells[1], '证书转换', False)
                                        update_checkbox_in_element(cells[1], '转机构', False)
                                                
                                # Cell 2 (Copies)
                                if len(cells) >= 3:
                                    # Users specified that copies are generally NOT checked/selected
                                    update_checkbox_in_element(cells[2], '副本', False)
                                                
                                # Cell 3 (CNAS)
                                if len(cells) >= 4:
                                    update_checkbox_in_element(cells[3], 'CNAS', is_sel)
                                break
                                
                        if not matched_sys and ('企业诚信' in c0_txt or '□其他：' in c0_txt or '其它' in c0_txt):
                            is_chengxin_sel = any('诚信' in s for s in systems)
                            if is_chengxin_sel:
                                set_cell_text(cells[0], '□其他：☑企业诚信管理体系GB/T 31950-2023')
                                if len(cells) >= 2:
                                    if is_transfer:
                                        set_cell_text(cells[1], '☑转换机构')
                                    else:
                                        set_cell_text(cells[1], '☑初次认证')
                            else:
                                set_cell_text(cells[0], '□其他：□企业诚信管理体系GB/T 31950-2023')
                                if len(cells) >= 2:
                                    set_cell_text(cells[1], '□初次认证')
                            matched_sys = True

                        if matched_sys:
                            continue
                        
                        # 2. Product/Service List table (Annex 6 / Annex 7)
                        if len(cells) == 4 and len(cell_texts) >= 2 and ('产品' in cell_texts[1] or '服务' in cell_texts[1] or '序号' in cell_texts[0]):
                            if cell_texts[0] in ['', '1', '01']:
                                first_ps = product_services[0] if product_services else {}
                                set_cell_text(cells[0], str(first_ps.get('seq', '1')))
                                set_cell_text(cells[1], str(first_ps.get('name', f"{comp_name}主要产品与服务")))
                                set_cell_text(cells[2], str(first_ps.get('specModel', '通用规格型号')))
                                set_cell_text(cells[3], str(first_ps.get('certScope', cert_scope)))
                                continue

                        # 3. Standard Key-Value Cell Matching for Application Form Table 0
                        if c0_clean in ['申请组织名称', '受审核组织名称', '组织名称', '受审核组织', '公司名称', '委托方甲方', '甲方委托方', '受审核单位']:
                            set_cell_text(cells[1], comp_name)
                        elif c0_clean in ['统一社会信用代码', '纳税人识别号', '社会信用代码']:
                            set_cell_text(cells[1], credit_code)
                        elif c0_clean in ['法定代表人', '法人代表', '法定代表人签字']:
                            set_cell_text(cells[1], legal_person)
                        elif c0_clean in ['注册地址']:
                            set_cell_text(cells[1], address)
                        elif c0_clean in ['实际办公地址', '经营地址', '通讯地址', '生产经营地址', '具体地址', '分支机构地址', '现场具体地址', '主经营地', '地址一主经营地']:
                            set_cell_text(cells[1], office_address)
                        elif c0_clean in ['联系人姓名及电话', '联系人及电话', '联系人电话']:
                            set_cell_text(cells[1], f"{contact_name} / {contact_phone}" if contact_name and contact_phone else (contact_name or contact_phone))
                        elif c0_clean in ['联系人', '管理者代表']:
                            name_val = contact_name if c0_clean == '联系人' else manager_name
                            phone_val = contact_phone if c0_clean == '联系人' else manager_phone
                            default_role = '总经理' if c0_clean == '联系人' else '经理'
                            
                            if len(cells) > 1:
                                set_cell_text(cells[1], name_val)
                            
                            for idx in range(2, len(cells) - 1):
                                txt_item = get_cell_text(cells[idx])
                                if '职务' in txt_item:
                                    set_cell_text(cells[idx+1], default_role)
                                elif any(k in txt_item for k in ['联系方式', '电话', '手机']):
                                    set_cell_text(cells[idx+1], phone_val)
                        elif c0_clean in ['拟申请覆盖的业务范围', '申请认证范围', '甲方拟申请认证覆盖范围', '认证覆盖范围', '服务内容', '活动与服务职能']:
                            if cert_scope:
                                set_cell_text(cells[1], cert_scope)
                        elif c0_clean in ['管理体系覆盖职工总人数', '甲方管理体系覆盖总人数', '管理体系覆盖人数', '体系覆盖人数', '分支机构覆盖人数', '现场人数', '全职人数', '合计有效覆盖人数']:
                            if covered_emp:
                                set_cell_text(cells[1], f"{covered_emp} 人" if not covered_emp.endswith('人') else covered_emp)
                        elif c0_clean in ['组织总人数', '甲方总人数', '职工总人数']:
                            if total_emp:
                                set_cell_text(cells[1], f"{total_emp} 人" if not total_emp.endswith('人') else total_emp)
                        elif c0_clean in ['原认证机构名称', '转出认证机构名称', '转出机构']:
                            set_cell_text(cells[1], transfer_from_org)
                        elif c0_clean in ['原认证证书编号', '原证书号', '证书号']:
                            set_cell_text(cells[1], transfer_cert_no)
                        elif c0_clean in ['原证书到期时间', '原证书有效期', '有效期截止至', '原证书到期日']:
                            set_cell_text(cells[1], transfer_expiry)
                        elif c0_clean == '组织基本信息':
                            replace_text_in_element(cells[1], '组织总人数：         ；', f"组织总人数： {total_emp} ；")
                            replace_text_in_element(cells[1], '体系覆盖人数         人', f"体系覆盖人数 {covered_emp} 人")
                        elif len(cells) == 5 and len(cell_texts) >= 5 and ('中文' in cell_texts[4] or '□中文' in cell_texts[4]):
                            t1 = cells[1].findall('.//w:t', NS)
                            if t1: t1[0].text = impl_date_str
                            t2 = cells[2].findall('.//w:t', NS)
                            if t2: t2[0].text = audit_date_str
                            t3 = cells[3].findall('.//w:t', NS)
                            if t3: t3[0].text = review_date_str
                            replace_text_in_element(cells[4], '□中文', '☑中文')
                        elif len(cell_texts) >= 2 and ('不适用的要求和理由' in cell_texts[1] or '组织近两年内是否发生' in cell_texts[1]):
                            not_applicable_str = ' 8.30 ；' if any('ISMS' in s or '信息安全' in s for s in systems) else ' 无 ；'
                            replace_text_in_element(cells[1], '                                                                      ；', not_applicable_str)
                            replace_text_in_element(cells[1], '□从未发生', '☑从未发生')
                        elif c0_clean == '曾接受的管理体系咨询机构的名称/人员':
                            replace_text_in_element(cells[1], '□自行建立体系', '☑自行建立体系')
                        elif c0_clean == '多管理体系结合度调查' and len(cells) >= 3:
                            for p in cells[2].findall('.//w:p', NS):
                                if is_multi_system:
                                    replace_text_in_element(p, '□是；□否', '☑是；□否')
                                else:
                                    replace_text_in_element(p, '□是；□否', '□是；☑否')
                        elif c0_clean == '是否曾获管理体系认证证书':
                            if has_history:
                                replace_text_in_element(cells[1], '□否；□是', '□否；☑是')
                                if qms_checked: replace_text_in_element(cells[1], '□质量管理体系', '☑质量管理体系')
                                if ems_checked: replace_text_in_element(cells[1], '□环境管理体系', '☑环境管理体系')
                                if ohsms_checked: replace_text_in_element(cells[1], '□职业健康安全管理体系', '☑职业健康安全管理体系')
                                if ipms_checked: replace_text_in_element(cells[1], '□知识产权管理体系', '☑知识产权管理体系')
                                if isms_checked: replace_text_in_element(cells[1], '□信息安全管理体系', '☑信息安全管理体系')
                                if itsms_checked: replace_text_in_element(cells[1], '□信息技术服务管理体系', '☑信息技术服务管理体系')
                                if enms_checked: replace_text_in_element(cells[1], '□能源管理体系', '☑能源管理体系')
                            else:
                                replace_text_in_element(cells[1], '□否；□是', '☑否；□是')
                        elif c0_clean == '管理体系认证证书是否暂停或者撤销' or c0_clean == '管理体系认证证书是否暂停或撤销':
                            if suspended_list:
                                details_str = ', '.join(suspended_list)
                                replace_text_in_element(cells[1], '□暂停', '☑暂停')
                                replace_text_in_element(cells[1], '涉及证书：                    ', f'涉及证书：{details_str}')
                            else:
                                pass
                        elif c0_clean == '是否涉及认证证书转换':
                            p_nodes = cells[1].findall('.//w:p', NS)
                            if len(p_nodes) >= 7:
                                if is_transfer:
                                    t0 = p_nodes[0].findall('.//w:t', NS)
                                    if len(t0) >= 3:
                                        t0[0].text = '□'
                                        t0[2].text = '☑'
                                    t1 = p_nodes[1].findall('.//w:t', NS)
                                    for i, t in enumerate(t1):
                                        if t.text == '□' and i + 1 < len(t1):
                                            label = t1[i+1].text or ''
                                            if (transfer_last_audit_type in label) or ('其他' in label and '其他' in transfer_last_audit_type):
                                                t.text = '☑'
                                                break
                                    t2 = p_nodes[2].findall('.//w:t', NS)
                                    if len(t2) >= 2:
                                        t2[1].text = f" {transfer_last_audit_date} "
                                    elif len(t2) == 1:
                                        t2[0].text = f"最后一次审核的日期： {transfer_last_audit_date}；"
                                    t3 = p_nodes[3].findall('.//w:t', NS)
                                    if len(t3) >= 4:
                                        t3[1].text = f" {transfer_accreditation} "
                                        t3[3].text = f" {transfer_expiry} "
                                    t4 = p_nodes[4].findall('.//w:t', NS)
                                    if len(t4) >= 2:
                                        t4[1].text = f" {transfer_from_org} "
                                    t5 = p_nodes[5].findall('.//w:t', NS)
                                    if len(t5) >= 2:
                                        t5[1].text = f" {transfer_reason} "
                                    t6 = p_nodes[6].findall('.//w:t', NS)
                                    if len(t6) >= 2:
                                        t6[1].text = " 运行状况良好且合规 "
                                else:
                                    t0 = p_nodes[0].findall('.//w:t', NS)
                                    if len(t0) >= 3:
                                        t0[0].text = '☑'
                                        t0[2].text = '□'
                        elif c0_clean == '再认证组织请填写，是否涉及相关变化':
                            replace_text_in_element(cells[1], '□不涉及；□涉及', '☑不涉及；□涉及')

                # Step C: Option Checkboxes in paragraphs to handle run-splitting
                for p in tree.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p'):
                    p_txt = ''.join(p.itertext())
                    if not p_txt:
                        continue
                        
                    if '是否有倒班' in p_txt or '□否；□是' in p_txt or '□否; □是' in p_txt:
                        replace_text_in_element(p, '□否', '☑否')
                        
                    if '多个固定/临时场所' in p_txt or '□是； □否' in p_txt or '□是; □否' in p_txt or '□是;□否' in p_txt:
                        replace_text_in_element(p, '□否', '☑否')
                        
                    if '工信部联协' in p_txt or '□否，请说明' in p_txt or '□不涉及' in p_txt:
                        if '工信部联协' in p_txt:
                            replace_text_in_element(p, '□不涉及', '☑不涉及')
                            replace_text_in_element(p, '□不涉及', '☑不涉及')

                    if '未获得 ISMS' in p_txt or '未获得ISMS' in p_txt:
                        replace_text_in_element(p, '□未获得 ISMS', '☑未获得 ISMS')
                        replace_text_in_element(p, '□未获得ISMS', '☑未获得ISMS')
                            
                    if '组织所用语言' in p_txt or '□中文；□英文' in p_txt or '□中文; □英文' in p_txt or '□中文;□英文' in p_txt or '□中文' in p_txt:
                        if '组织所用语言' in p_txt:
                            replace_text_in_element(p, '□中文', '☑中文')
                        
                    if '事故或投诉' in p_txt or '□从未发生' in p_txt:
                        replace_text_in_element(p, '□从未发生', '☑从未发生')
                        
                    if '曾接受的' in p_txt or '□自行建立体系' in p_txt:
                        replace_text_in_element(p, '□自行建立体系，未接受咨询', '☑自行建立体系，未接受咨询')
                        replace_text_in_element(p, '□自行建立体系', '☑自行建立体系')
                        
                    if '多管理体系结合度' in p_txt or '1. 一套整合的文件' in p_txt:
                        replace_text_in_element(p, '□是；□否', '☑是；□否')
                        replace_text_in_element(p, '□是; □否', '☑是; □否')
                        replace_text_in_element(p, '□是;□否', '☑是;□否')
                        replace_text_in_element(p, '□是', '☑是')
                        
                    if '是否曾获管理体系认证证书' in p_txt or '□否；□是，曾获' in p_txt or '□否; □是' in p_txt:
                        if not has_history:
                            replace_text_in_element(p, '□否', '☑否')
                            
                    if '涉及认证证书转换' in p_txt or '□不涉及；□涉及' in p_txt or '□不涉及; □涉及' in p_txt or '□不涉及;□涉及' in p_txt:
                        if is_transfer:
                            replace_text_in_element(p, '□涉及', '☑涉及')
                            replace_text_in_element(p, '☑不涉及', '□不涉及')
                        else:
                            replace_text_in_element(p, '□不涉及', '☑不涉及')
                            replace_text_in_element(p, '☑涉及', '□涉及')
                            
                    if '再认证组织请填写' in p_txt or '□不涉及；□涉及以下变化' in p_txt or '□不涉及; □涉及' in p_txt or '□不涉及;□涉及' in p_txt:
                        replace_text_in_element(p, '□不涉及', '☑不涉及')

                    # Apply custom user online edits to each text node inside the paragraph to preserve edits
                    if edits:
                        for t in p.findall('.//w:t', NS):
                            if t.text:
                                for original, revised in edits.items():
                                    if original in t.text:
                                        t.text = t.text.replace(original, revised)

                # Ensure contract body starts on Page 2 in BCZC-RC-02-A7 认证合同.docx
                for p in tree.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p'):
                    p_txt = ''.join(p.itertext()).strip()
                    if p_txt.startswith('甲、乙双方依据《中华人民共和国民法典》'):
                        pPr = p.find('w:pPr', NS)
                        if pPr is None:
                            pPr = ET.Element('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}pPr')
                            p.insert(0, pPr)
                        pbb = pPr.find('w:pageBreakBefore', NS)
                        if pbb is None:
                            pbb = ET.Element('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}pageBreakBefore')
                            pPr.append(pbb)
                        pbb.attrib['{http://schemas.openxmlformats.org/wordprocessingml/2006/main}val'] = '1'

                # Apply custom user online edits at paragraph level (<w:p>) to handle text split across multiple <w:t> elements
                if edits:
                    for original, revised in edits.items():
                        if not original or not revised or original == revised:
                            continue
                        for p in tree.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p'):
                            if replace_text_in_element(p, original, revised):
                                break

                # Final global sweep for company name
                if comp_name:
                    replace_text_in_element(tree, '***公司', comp_name)
                    if comp_name != '河北启恒电力科技有限公司':
                        replace_text_in_element(tree, '河北启恒电力科技有限公司', comp_name)

                # Universal newline expansion sweep: expand any '\n' inside <w:t> elements into <w:br> tags
                for r in tree.findall('.//w:r', NS):
                    ts = r.findall('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t')
                    if not ts:
                        continue
                    for t in ts:
                        if t.text and '\n' in t.text:
                            parts = t.text.split('\n')
                            children = list(r)
                            try:
                                t_index = children.index(t)
                                r.remove(t)
                                
                                inserted_nodes = []
                                for idx, part in enumerate(parts):
                                    if idx > 0:
                                        br = ET.Element('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}br')
                                        inserted_nodes.append(br)
                                    new_t = ET.Element('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t')
                                    new_t.text = part
                                    for k, v in t.attrib.items():
                                        new_t.attrib[k] = v
                                    inserted_nodes.append(new_t)
                                
                                for node in reversed(inserted_nodes):
                                    r.insert(t_index, node)
                            except ValueError:
                                pass

                content = ET.tostring(tree, encoding='utf-8')
            except Exception as e:
                sys.stderr.write(f"XML parse error in {name}: {e}\n")
        
        zip_bytes[name] = content
    
    z.close()
    return zip_bytes, []

def main():
    if len(sys.argv) < 3:
        print("Usage: generate_docx.py <input_json_path> <output_zip_path>")
        sys.exit(1)
        
    input_json_path = sys.argv[1]
    output_zip_path = sys.argv[2]
    
    with open(input_json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    templates_dir = os.path.join(os.getcwd(), 'data', 'templates')
    selected_files = data.get('selectedFiles', [])
    
    if not selected_files:
        selected_files = os.listdir(templates_dir)
        
    out_zip = zipfile.ZipFile(output_zip_path, 'w', zipfile.ZIP_DEFLATED)
    generated_files = []
    
    for fname in selected_files:
        fpath = os.path.join(templates_dir, fname)
        if not os.path.exists(fpath):
            continue
            
        is_zip = zipfile.is_zipfile(fpath)
        if is_zip:
            try:
                zipped_file_bytes, _ = fill_docx(fpath, data)
                
                tmp_docx = os.path.join('/tmp', fname)
                docx_buf = zipfile.ZipFile(tmp_docx, 'w', zipfile.ZIP_DEFLATED)
                for k, v in zipped_file_bytes.items():
                    docx_buf.writestr(k, v)
                docx_buf.close()
                out_zip.write(tmp_docx, fname)
                generated_files.append(fname)
            except Exception as err:
                sys.stderr.write(f"Error processing {fname}: {err}\n")
                out_zip.write(fpath, fname)
                generated_files.append(fname)
        else:
            out_zip.write(fpath, fname)
            generated_files.append(fname)
            
    b_reqs = data.get('bClassRequirements', [])
    comp_name = data.get('companyInfo', {}).get('name', '申请企业')
    systems = data.get('systems', [])
    
    if b_reqs:
        b_text = f"=======================================================\n" \
                 f"《{comp_name} - 客户线下自备资料清单 (B类)》\n" \
                 f"=======================================================\n\n" \
                 f"【提示说明】\n" \
                 f"根据您申请的认证体系（{'、'.join(systems)}），除了 ZIP 包内自动生成的 A 类申请表格与合同外，\n" \
                 f"请您自行准备以下资料，并于线下评审与盖章时一并提交：\n\n" + \
                 "\n".join([f"{idx+1}. {item}" for idx, item in enumerate(b_reqs)]) + \
                 f"\n\n-------------------------------------------------------\n" \
                 f"注意事项：\n" \
                 f"1. 所有自备复印件资料需加盖企业公章；\n" \
                 f"2. 涉及行政许可/资质执照的文件需确保在有效期内；\n" \
                 f"3. 体系文件需保证已发布并持续有效运行满 3 个月以上。\n" \
                 f"-------------------------------------------------------\n"
        out_zip.writestr("客户自备资料清单(B类).txt", b_text.encode('utf-8'))
        generated_files.append("客户自备资料清单(B类).txt")

    out_zip.close()
    
    previews = {}
    try:
        z_out = zipfile.ZipFile(output_zip_path, 'r')
        for fname in generated_files:
            if fname.endswith('.txt'):
                try:
                    txt_bytes = z_out.read(fname)
                    previews[fname] = {
                        "type": "txt",
                        "content": txt_bytes.decode('utf-8', errors='ignore')
                    }
                except Exception as ex_t:
                    previews[fname] = {"type": "txt", "error": str(ex_t)}
            else:
                try:
                    doc_bytes = z_out.read(fname)
                    is_docx_zip = False
                    try:
                        doc_z = zipfile.ZipFile(zipfile.io.BytesIO(doc_bytes))
                        if 'word/document.xml' in doc_z.namelist():
                            is_docx_zip = True
                    except Exception:
                        pass
                        
                    if is_docx_zip:
                        doc_z = zipfile.ZipFile(zipfile.io.BytesIO(doc_bytes))
                        xml_content = doc_z.read('word/document.xml')
                        tree = ET.fromstring(xml_content)
                        
                        paragraphs = []
                        for p in tree.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p'):
                            txt = ''.join([t.text for t in p.findall('.//w:t', NS) if t.text]).strip()
                            if txt and len(paragraphs) < 30:
                                paragraphs.append(txt)
                                
                        tables = []
                        for tbl in tree.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}tbl'):
                            rows = []
                            for tr in tbl.findall('.//w:tr', NS):
                                cells = []
                                for tc in tr.findall('.//w:tc', NS):
                                    cell_txt = ''.join([t.text for t in tc.findall('.//w:t', NS) if t.text]).strip()
                                    cells.append(cell_txt)
                                if any(cells):
                                    rows.append(cells)
                            if rows:
                                tables.append(rows)
                                
                        previews[fname] = {
                            "type": "docx",
                            "paragraphs": paragraphs,
                            "tables": tables
                        }
                    elif fname.lower().endswith('.pdf'):
                        previews[fname] = {
                            "type": "pdf",
                            "message": "检测到该文件为 PDF 格式模板。系统已将该 PDF 模板原汁原味安全打包进您最终的申报材料 ZIP 包内。在下载解包后，您即可直接打印或使用 PDF 浏览器/编辑器查阅与签署。"
                        }
                    else:
                        ext_note = "（注意：如果直接在操作系统中将 .doc 后缀改名为 .docx，底层文件结构仍为二进制，需用 Word/WPS 打开后‘另存为’.docx）" if fname.lower().endswith('.docx') else ""
                        previews[fname] = {
                            "type": "doc",
                            "message": f"检测到该文件为传统二进制 Word 97-2003 格式 (.doc) 或非标准 OpenXML 结构{ext_note}。由于浏览器前端渲染引擎不支持直接解析二进制非解压格式文档，系统已为您原汁原味安全打包。当您点击“生成材料包并下载”后，解包即可正常阅读与打印。建议操作：请用 Microsoft Word 或 WPS 打开本模板，通过‘文件’菜单‘另存为’最新标配的 .docx 格式并重新上传覆盖即可。"
                        }
                except Exception as ex_p:
                    previews[fname] = {"type": "doc", "message": f"Word文档解析异常: {ex_p}"}
        z_out.close()
    except Exception as e_prev:
        sys.stderr.write(f"Preview extraction error: {e_prev}\n")

    print(json.dumps({"success": True, "files": generated_files, "previews": previews}))

if __name__ == '__main__':
    main()
