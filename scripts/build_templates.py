import os
import sys
import zipfile
import io

TEMPLATES_DIR = os.path.join(os.getcwd(), 'data', 'templates')
os.makedirs(TEMPLATES_DIR, exist_ok=True)

STYLES_XML = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="SimSun" w:eastAsia="SimSun" w:hAnsi="SimSun" w:cs="SimSun"/>
        <w:sz w:val="21"/>
        <w:szCs w:val="21"/>
        <w:color w:val="000000"/>
      </w:rPr>
    </w:rPrDefault>
    <w:pPrDefault>
      <w:pPr>
        <w:spacing w:before="60" w:after="60" w:line="280" w:lineRule="auto"/>
      </w:pPr>
    </w:pPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:qFormat/>
  </w:style>
  <w:style w:type="table" w:default="1" w:styleId="TableGrid">
    <w:name w:val="Table Grid"/>
    <w:tblPr>
      <w:tblBorders>
        <w:top w:val="single" w:sz="6" w:space="0" w:color="000000"/>
        <w:left w:val="single" w:sz="6" w:space="0" w:color="000000"/>
        <w:bottom w:val="single" w:sz="6" w:space="0" w:color="000000"/>
        <w:right w:val="single" w:sz="6" w:space="0" w:color="000000"/>
        <w:insideH w:val="single" w:sz="4" w:space="0" w:color="000000"/>
        <w:insideV w:val="single" w:sz="4" w:space="0" w:color="000000"/>
      </w:tblBorders>
      <w:tblCellMar>
        <w:top w:w="120" w:type="dxa"/>
        <w:left w:w="180" w:type="dxa"/>
        <w:bottom w:w="120" w:type="dxa"/>
        <w:right w:w="180" w:type="dxa"/>
      </w:tblCellMar>
    </w:tblPr>
  </w:style>
</w:styles>'''

def create_docx(title, subtitle, sections, header_title="博创众诚（北京）认证服务有限公司"):
    body_xml = ""
    
    # Header block
    if header_title:
        body_xml += f'''
        <w:p>
          <w:pPr>
            <w:jc w:val="right"/>
            <w:spacing w:before="0" w:after="120" w:line="240" w:lineRule="auto"/>
            <w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="004A99"/></w:pBdr>
          </w:pPr>
          <w:r>
            <w:rPr>
              <w:rFonts w:ascii="SimHei" w:eastAsia="SimHei" w:hAnsi="SimHei"/>
              <w:sz w:val="18"/>
              <w:szCs w:val="18"/>
              <w:color w:val="004A99"/>
              <w:b/>
            </w:rPr>
            <w:t>{header_title}</w:t>
          </w:r>
        </w:p>
        '''

    # Document Title
    body_xml += f'''
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
        <w:spacing w:before="240" w:after="120" w:line="360" w:lineRule="auto"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="SimHei" w:eastAsia="SimHei" w:hAnsi="SimHei"/>
          <w:b/>
          <w:sz w:val="32"/>
          <w:szCs w:val="32"/>
          <w:color w:val="000000"/>
        </w:rPr>
        <w:t>{title}</w:t>
      </w:r>
    </w:p>
    '''

    if subtitle:
        body_xml += f'''
        <w:p>
          <w:pPr>
            <w:jc w:val="center"/>
            <w:spacing w:before="0" w:after="240" w:line="300" w:lineRule="auto"/>
          </w:pPr>
          <w:r>
            <w:rPr>
              <w:rFonts w:ascii="SimSun" w:eastAsia="SimSun" w:hAnsi="SimSun"/>
              <w:sz w:val="22"/>
              <w:szCs w:val="22"/>
              <w:color w:val="333333"/>
            </w:rPr>
            <w:t>{subtitle}</w:t>
          </w:r>
        </w:p>
        '''

    for sect in sections:
        sect_type = sect[0]
        if sect_type == 'paragraph':
            text = sect[1]
            is_bold = sect[2] if len(sect) > 2 else False
            align = sect[3] if len(sect) > 3 else 'left'
            indent = sect[4] if len(sect) > 4 else False
            
            bold_xml = '<w:b/>' if is_bold else ''
            jc_xml = f'<w:jc w:val="{align}"/>' if align != 'left' else ''
            ind_xml = '<w:ind w:firstLine="420"/>' if indent else ''
            
            body_xml += f'''
            <w:p>
              <w:pPr>
                {jc_xml}
                {ind_xml}
                <w:spacing w:before="80" w:after="80" w:line="300" w:lineRule="auto"/>
              </w:pPr>
              <w:r>
                <w:rPr>
                  <w:rFonts w:ascii="SimSun" w:eastAsia="SimSun" w:hAnsi="SimSun"/>
                  {bold_xml}
                  <w:sz w:val="22"/>
                  <w:szCs w:val="22"/>
                  <w:color w:val="000000"/>
                </w:rPr>
                <w:t>{text}</w:t>
              </w:r>
            </w:p>
            '''
        elif sect_type == 'page_break_paragraph':
            text = sect[1]
            is_bold = sect[2] if len(sect) > 2 else False
            align = sect[3] if len(sect) > 3 else 'left'
            bold_xml = '<w:b/>' if is_bold else ''
            jc_xml = f'<w:jc w:val="{align}"/>' if align != 'left' else ''
            body_xml += f'''
            <w:p>
              <w:pPr>
                <w:pageBreakBefore w:val="1"/>
                {jc_xml}
                <w:spacing w:before="120" w:after="120" w:line="320" w:lineRule="auto"/>
              </w:pPr>
              <w:r>
                <w:rPr>
                  <w:rFonts w:ascii="SimHei" w:eastAsia="SimHei" w:hAnsi="SimHei"/>
                  {bold_xml}
                  <w:sz w:val="24"/>
                  <w:szCs w:val="24"/>
                  <w:color w:val="000000"/>
                </w:rPr>
                <w:t>{text}</w:t>
              </w:r>
            </w:p>
            '''
        elif sect_type == 'heading':
            text = sect[1]
            body_xml += f'''
            <w:p>
              <w:pPr>
                <w:spacing w:before="200" w:after="100" w:line="320" w:lineRule="auto"/>
              </w:pPr>
              <w:r>
                <w:rPr>
                  <w:rFonts w:ascii="SimHei" w:eastAsia="SimHei" w:hAnsi="SimHei"/>
                  <w:b/>
                  <w:sz w:val="24"/>
                  <w:szCs w:val="24"/>
                  <w:color w:val="000000"/>
                </w:rPr>
                <w:t>{text}</w:t>
              </w:r>
            </w:p>
            '''
        elif sect_type == 'key_value_table':
            content = sect[1]
            body_xml += '''
            <w:tbl>
              <w:tblPr>
                <w:tblW w:w="8800" w:type="dxa"/>
                <w:jc w:val="center"/>
                <w:tblBorders>
                  <w:top w:val="single" w:sz="6" w:space="0" w:color="000000"/>
                  <w:left w:val="single" w:sz="6" w:space="0" w:color="000000"/>
                  <w:bottom w:val="single" w:sz="6" w:space="0" w:color="000000"/>
                  <w:right w:val="single" w:sz="6" w:space="0" w:color="000000"/>
                  <w:insideH w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                  <w:insideV w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                </w:tblBorders>
                <w:tblCellMar>
                  <w:top w:w="120" w:type="dxa"/>
                  <w:bottom w:w="120" w:type="dxa"/>
                  <w:left w:w="180" w:type="dxa"/>
                  <w:right w:w="180" w:type="dxa"/>
                </w:tblCellMar>
              </w:tblPr>
              <w:tblGrid>
                <w:gridCol w:w="2800"/>
                <w:gridCol w:w="6000"/>
              </w:tblGrid>
            '''
            for key, val in content:
                body_xml += f'''
                <w:tr>
                  <w:trPr><w:cantSplit/></w:trPr>
                  <w:tc>
                    <w:tcPr>
                      <w:tcW w:w="2800" w:type="dxa"/>
                      <w:shd w:val="clear" w:color="auto" w:fill="F1F5F9"/>
                      <w:vAlign w:val="center"/>
                    </w:tcPr>
                    <w:p>
                      <w:pPr>
                        <w:spacing w:before="40" w:after="40" w:line="260" w:lineRule="auto"/>
                      </w:pPr>
                      <w:r>
                        <w:rPr>
                          <w:rFonts w:ascii="SimHei" w:eastAsia="SimHei" w:hAnsi="SimHei"/>
                          <w:b/>
                          <w:sz w:val="21"/>
                          <w:szCs w:val="21"/>
                          <w:color w:val="000000"/>
                        </w:rPr>
                        <w:t>{key}</w:t>
                      </w:r>
                    </w:p>
                  </w:tc>
                  <w:tc>
                    <w:tcPr>
                      <w:tcW w:w="6000" w:type="dxa"/>
                      <w:vAlign w:val="center"/>
                    </w:tcPr>
                    <w:p>
                      <w:pPr>
                        <w:spacing w:before="40" w:after="40" w:line="260" w:lineRule="auto"/>
                      </w:pPr>
                      <w:r>
                        <w:rPr>
                          <w:rFonts w:ascii="SimSun" w:eastAsia="SimSun" w:hAnsi="SimSun"/>
                          <w:sz w:val="21"/>
                          <w:szCs w:val="21"/>
                          <w:color w:val="000000"/>
                        </w:rPr>
                        <w:t>{val}</w:t>
                      </w:r>
                    </w:p>
                  </w:tc>
                </w:tr>
                '''
            body_xml += '</w:tbl><w:p/>'

        elif sect_type == 'table':
            headers, rows = sect[1], sect[2]
            col_count = len(headers)
            col_width = int(8800 / col_count)
            body_xml += f'''
            <w:tbl>
              <w:tblPr>
                <w:tblW w:w="8800" w:type="dxa"/>
                <w:jc w:val="center"/>
                <w:tblBorders>
                  <w:top w:val="single" w:sz="6" w:space="0" w:color="000000"/>
                  <w:left w:val="single" w:sz="6" w:space="0" w:color="000000"/>
                  <w:bottom w:val="single" w:sz="6" w:space="0" w:color="000000"/>
                  <w:right w:val="single" w:sz="6" w:space="0" w:color="000000"/>
                  <w:insideH w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                  <w:insideV w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                </w:tblBorders>
                <w:tblCellMar>
                  <w:top w:w="120" w:type="dxa"/>
                  <w:bottom w:w="120" w:type="dxa"/>
                  <w:left w:w="180" w:type="dxa"/>
                  <w:right w:w="180" w:type="dxa"/>
                </w:tblCellMar>
              </w:tblPr>
              <w:tblGrid>
            ''' + ''.join([f'<w:gridCol w:w="{col_width}"/>' for _ in range(col_count)]) + '</w:tblGrid>'

            # Header Row
            body_xml += '<w:tr><w:trPr><w:cantSplit/><w:tblHeader/></w:trPr>'
            for h in headers:
                body_xml += f'''
                <w:tc>
                  <w:tcPr>
                    <w:tcW w:w="{col_width}" w:type="dxa"/>
                    <w:shd w:val="clear" w:color="auto" w:fill="E2E8F0"/>
                    <w:vAlign w:val="center"/>
                  </w:tcPr>
                  <w:p>
                    <w:pPr><w:jc w:val="center"/><w:spacing w:before="40" w:after="40" w:line="240" w:lineRule="auto"/></w:pPr>
                    <w:r><w:rPr><w:rFonts w:ascii="SimHei" w:eastAsia="SimHei"/><w:b/><w:sz w:val="21"/><w:color w:val="000000"/></w:rPr><w:t>{h}</w:t></w:r>
                  </w:p>
                </w:tc>
                '''
            body_xml += '</w:tr>'

            # Data Rows
            for r in rows:
                body_xml += '<w:tr><w:trPr><w:cantSplit/></w:trPr>'
                for cell_val in r:
                    body_xml += f'''
                    <w:tc>
                      <w:tcPr>
                        <w:tcW w:w="{col_width}" w:type="dxa"/>
                        <w:vAlign w:val="center"/>
                      </w:tcPr>
                      <w:p>
                        <w:pPr><w:spacing w:before="40" w:after="40" w:line="240" w:lineRule="auto"/></w:pPr>
                        <w:r><w:rPr><w:rFonts w:ascii="SimSun" w:eastAsia="SimSun"/><w:sz w:val="21"/><w:color w:val="000000"/></w:rPr><w:t>{cell_val}</w:t></w:r>
                      </w:p>
                    </w:tc>
                    '''
                body_xml += '</w:tr>'
            body_xml += '</w:tbl><w:p/>'

        elif sect_type == 'signoff_table':
            body_xml += '''
            <w:tbl>
              <w:tblPr>
                <w:tblW w:w="8800" w:type="dxa"/>
                <w:jc w:val="center"/>
                <w:tblBorders>
                  <w:top w:val="single" w:sz="6" w:space="0" w:color="000000"/>
                  <w:left w:val="single" w:sz="6" w:space="0" w:color="000000"/>
                  <w:bottom w:val="single" w:sz="6" w:space="0" w:color="000000"/>
                  <w:right w:val="single" w:sz="6" w:space="0" w:color="000000"/>
                  <w:insideH w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                  <w:insideV w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                </w:tblBorders>
                <w:tblCellMar>
                  <w:top w:w="140" w:type="dxa"/>
                  <w:bottom w:w="140" w:type="dxa"/>
                  <w:left w:w="180" w:type="dxa"/>
                  <w:right w:w="180" w:type="dxa"/>
                </w:tblCellMar>
              </w:tblPr>
              <w:tblGrid>
                <w:gridCol w:w="4400"/>
                <w:gridCol w:w="4400"/>
              </w:tblGrid>
              <w:tr>
                <w:trPr><w:cantSplit/></w:trPr>
                <w:tc>
                  <w:tcPr><w:tcW w:w="4400" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F8FAFC"/><w:vAlign w:val="top"/></w:tcPr>
                  <w:p><w:pPr><w:spacing w:before="60" w:after="60"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="SimHei" w:eastAsia="SimHei"/><w:b/><w:sz w:val="22"/></w:rPr><w:t>甲方（委托方）： ***公司</w:t></w:r></w:p>
                  <w:p><w:pPr><w:spacing w:before="60" w:after="60"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="SimSun" w:eastAsia="SimSun"/><w:sz w:val="21"/></w:rPr><w:t>统一社会信用代码： 91130982MA0G4GEM6H</w:t></w:r></w:p>
                  <w:p><w:pPr><w:spacing w:before="60" w:after="60"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="SimSun" w:eastAsia="SimSun"/><w:sz w:val="21"/></w:rPr><w:t>法定代表人（签字）： 姜楠楠</w:t></w:r></w:p>
                  <w:p><w:pPr><w:spacing w:before="60" w:after="60"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="SimSun" w:eastAsia="SimSun"/><w:sz w:val="21"/></w:rPr><w:t>联系人： 解明玉</w:t></w:r></w:p>
                  <w:p><w:pPr><w:spacing w:before="60" w:after="60"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="SimSun" w:eastAsia="SimSun"/><w:sz w:val="21"/></w:rPr><w:t>联系电话： 13333333333</w:t></w:r></w:p>
                  <w:p><w:pPr><w:spacing w:before="60" w:after="60"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="SimSun" w:eastAsia="SimSun"/><w:sz w:val="21"/></w:rPr><w:t>通讯地址： 河北省沧州市任丘市经济技术开发区</w:t></w:r></w:p>
                  <w:p><w:pPr><w:spacing w:before="120" w:after="60"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="SimSun" w:eastAsia="SimSun"/><w:sz w:val="21"/></w:rPr><w:t>（盖章处）</w:t></w:r></w:p>
                  <w:p><w:pPr><w:spacing w:before="180" w:after="60"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="SimSun" w:eastAsia="SimSun"/><w:sz w:val="21"/></w:rPr><w:t>签署日期：       年   月   日</w:t></w:r></w:p>
                </w:tc>
                <w:tc>
                  <w:tcPr><w:tcW w:w="4400" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F8FAFC"/><w:vAlign w:val="top"/></w:tcPr>
                  <w:p><w:pPr><w:spacing w:before="60" w:after="60"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="SimHei" w:eastAsia="SimHei"/><w:b/><w:sz w:val="22"/></w:rPr><w:t>乙方（受托方）： 北京中轻质量认证中心有限公司</w:t></w:r></w:p>
                  <w:p><w:pPr><w:spacing w:before="60" w:after="60"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="SimSun" w:eastAsia="SimSun"/><w:sz w:val="21"/></w:rPr><w:t>统一社会信用代码： 911100001000123456</w:t></w:r></w:p>
                  <w:p><w:pPr><w:spacing w:before="60" w:after="60"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="SimSun" w:eastAsia="SimSun"/><w:sz w:val="21"/></w:rPr><w:t>法定代表人： 张主任</w:t></w:r></w:p>
                  <w:p><w:pPr><w:spacing w:before="60" w:after="60"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="SimSun" w:eastAsia="SimSun"/><w:sz w:val="21"/></w:rPr><w:t>联系人： 认证部</w:t></w:r></w:p>
                  <w:p><w:pPr><w:spacing w:before="60" w:after="60"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="SimSun" w:eastAsia="SimSun"/><w:sz w:val="21"/></w:rPr><w:t>联系电话： 010-88888888</w:t></w:r></w:p>
                  <w:p><w:pPr><w:spacing w:before="60" w:after="60"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="SimSun" w:eastAsia="SimSun"/><w:sz w:val="21"/></w:rPr><w:t>开户银行： 中国工商银行北京东三环支行</w:t></w:r></w:p>
                  <w:p><w:pPr><w:spacing w:before="60" w:after="60"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="SimSun" w:eastAsia="SimSun"/><w:sz w:val="21"/></w:rPr><w:t>银行账号： 0200000109001234567</w:t></w:r></w:p>
                  <w:p><w:pPr><w:spacing w:before="60" w:after="60"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="SimSun" w:eastAsia="SimSun"/><w:sz w:val="21"/></w:rPr><w:t>通讯地址： 北京市朝阳区东三环中路 18 号</w:t></w:r></w:p>
                  <w:p><w:pPr><w:spacing w:before="120" w:after="60"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="SimSun" w:eastAsia="SimSun"/><w:sz w:val="21"/></w:rPr><w:t>（盖章处）</w:t></w:r></w:p>
                  <w:p><w:pPr><w:spacing w:before="180" w:after="60"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="SimSun" w:eastAsia="SimSun"/><w:sz w:val="21"/></w:rPr><w:t>签署日期：       年   月   日</w:t></w:r></w:p>
                </w:tc>
              </w:tr>
            </w:tbl><w:p/>
            '''

        elif sect_type == 'bullet_list':
            content = sect[1]
            for item in content:
                body_xml += f'''
                <w:p>
                  <w:pPr><w:spacing w:before="60" w:after="60" w:line="300" w:lineRule="auto"/></w:pPr>
                  <w:r><w:rPr><w:rFonts w:ascii="SimSun" w:eastAsia="SimSun"/><w:sz w:val="21"/><w:color w:val="000000"/></w:rPr><w:t>• {item}</w:t></w:r>
                </w:p>
                '''

    doc_xml = f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    {body_xml}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
      <w:cols w:space="720"/>
    </w:sectPr>
  </w:body>
</w:document>'''

    content_types = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>'''

    rels = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>'''

    doc_rels = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>'''

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as z:
        z.writestr('[Content_Types].xml', content_types)
        z.writestr('_rels/.rels', rels)
        z.writestr('word/document.xml', doc_xml)
        z.writestr('word/styles.xml', STYLES_XML)
        z.writestr('word/_rels/document.xml.rels', doc_rels)
    return buf.getvalue()

templates_spec = [
    (
        "BCZC-RC-01-A7 认证申请书.docx",
        "管理体系认证通用申请书",
        "（博创众诚(北京)认证服务有限公司）",
        [
            ('heading', '【一、申请组织基本档案信息表】'),
            ('key_value_table', [
                ('申请组织全称（中文）', '***公司'),
                ('统一社会信用代码', '91130982MA0G4GEM6H'),
                ('法定代表人及电话', '姜楠楠 / 13333333333'),
                ('注册地址（执照一致）', '河北省沧州市任丘市经济技术开发区'),
                ('实际生产/办公地址', '河北省沧州市任丘市经济技术开发区'),
                ('管理者代表 / 联系人', '解明玉 / 13333333333'),
                ('电子邮箱及工作时间', 'jie@example.com / 08:30-17:30 (不倒班/周休2日)'),
                ('体系覆盖职工总人数', '50 人 (有效覆盖人数: 50 人)'),
                ('申请认证体系类型', '质量管理体系 (ISO 9001:2015)'),
                ('拟申请覆盖的业务范围', '高低压开关柜、配电箱、电力变压器的组装、生产及销售及相关管理活动'),
                ('申请认证类型与状态', '☑初次认证  □再认证  □监督审核  □机构转换')
            ]),
            ('heading', '【二、管理体系运行及现状声明】'),
            ('paragraph', '1. 本组织管理体系文件已按国家相关标准建立并发布实施，首版文件发布实施日期为 2025年10月20日（运行满3个月以上）。', False, 'left', True),
            ('paragraph', '2. 本组织已完成覆盖全范围的内部审核与管理评审，内审日期为 2026年01月10日，管理评审日期为 2026年01月15日。', False, 'left', True),
            ('paragraph', '3. 本组织在近三年内无重大质量、安全、环保事故，无国家/省级监督抽查不合格记录，且无违法违规行为。', False, 'left', True),
            ('heading', '【三、申请方独立性承诺与授权签章】'),
            ('paragraph', '本申请组织承诺：本申请书所填写的内容及提交的所有资质、合同及辅助材料均真实、合法、准确、有效。遵守国家认证认可相关法律法规，按期配合审核并支付相应认证费用。', False, 'left', True),
            ('paragraph', '申请组织（盖公章处）： ***公司', True, 'right'),
            ('paragraph', '法定代表人/授权代表（手写签字）： 姜楠楠', False, 'right'),
            ('paragraph', '申请日期： 2026年01月18日', False, 'right')
        ]
    ),
    (
        "BCZC-RC-02-A7 认证合同.docx",
        "管理体系认证服务技术合同",
        "合同编号： BCZC-2026-CONTRACT-001",
        [
            ('heading', '【合同双方基本信息】'),
            ('key_value_table', [
                ('委托方（甲方）', '***公司'),
                ('受托方（乙方）', '北京中轻质量认证中心有限公司'),
                ('合同签订地点', '北京市朝阳区'),
                ('甲方拟申请认证覆盖范围', '高低压开关柜、配电箱、电力变压器的组装、生产及销售及相关管理活动'),
                ('甲方管理体系覆盖总人数', '50 人 (其中有效人数 50 人)')
            ]),
            ('heading', '【第一条 认证服务内容】'),
            ('paragraph', '1.1 乙方依据国家认证认可法律法规及规范性文件，接受甲方委托，对甲方建立的 ISO 9001:2015 质量管理体系 实施认证审核与评定。', False, 'left', True),
            ('paragraph', '1.2 审核类型包括：初次认证（含阶段一现场/非现场审查及阶段二现场审核）。审核合格后由乙方颁发国家认监委（CNCA）及 CCAA 认可的认证证书。', False, 'left', True),
            ('heading', '【第二条 双方权利与义务】'),
            ('paragraph', '2.1 甲方有权获得公正、客观的认证审核服务；甲方承诺向乙方提供真实、充分、有效的体系文件、生产现场记录及行政许可证明。', False, 'left', True),
            ('paragraph', '2.2 乙方负责安排具备资质的专业审核组实施现场审核，严格遵守国家保密规定，对审核中获悉的甲方商业及技术秘密负有终身保密义务。', False, 'left', True),
            ('heading', '【第三条 认证费用及支付方式】'),
            ('paragraph', '3.1 初次/再认证费 合计： 15000 元（大写： 壹万伍仟元整 ）；', True, 'left', False),
            ('paragraph', '3.2 年度监督审费用 合计： 8000 元/年（大写： 捌仟元整/年 ）；', True, 'left', False),
            ('paragraph', '3.3 审核人员食宿及交通差旅费： 由甲方按实际发生据实支付或承担。', False, 'left', False),
            ('paragraph', '3.4 付款方式： 甲方应于本合同生效之日起 5 个工作日内向乙方指定账户支付首期认证费用。', False, 'left', False),
            ('heading', '【第四条 违约责任与争议解决】'),
            ('paragraph', '4.1 任何一方违反本合同约定给对方造成经济损失的，应当依法承担赔偿责任。', False, 'left', True),
            ('paragraph', '4.2 因履行本合同发生的争议，双方应友好协商解决；协商不成的，任何一方均有权向乙方所在地（北京市朝阳区）人民法院提起诉讼。', False, 'left', True),
            ('heading', '【第五条 附则】'),
            ('paragraph', '5.1 本合同一式两份，甲乙双方各执一份，经双方法定代表人或授权代表签字并加盖公章之日起生效，具有同等法律效力。', False, 'left', True),
            ('page_break_paragraph', '【合同签署与盖章专区】', True, 'center'),
            ('signoff_table',)
        ]
    ),
    (
        "承诺书.docx",
        "法定代表人合规与真实性承诺书",
        "致：博创众诚（北京）认证服务有限公司",
        [
            ('paragraph', '我公司（ ***公司 ）郑重向贵机构承诺：', True),
            ('bullet_list', [
                '我公司的注册地址为： 河北省沧州市任丘市经济技术开发区 ，实际生产、办公经营地址为： 河北省沧州市任丘市经济技术开发区 。',
                '本公司提交的所有营业执照、行政许可证明、特种设备检验报告及社保参保证明文件完全真实、有效、合法。',
                '本公司管理体系真实运行满 3 个月以上，无虚假记录，近三年内无重大质量、安全或环保事故。'
            ]),
            ('paragraph', '承诺单位（盖章）： ***公司', True, 'right'),
            ('paragraph', '法定代表人（手写签字）： 姜楠楠', False, 'right'),
            ('paragraph', '承诺日期： 2026年01月18日', False, 'right')
        ]
    ),
    (
        "关于转换认证机构的声明.docx",
        "关于转换认证机构的声明书",
        "致：博创众诚（北京）认证服务有限公司",
        [
            ('heading', '【基本转换信息表】'),
            ('key_value_table', [
                ('申请组织名称', '***公司'),
                ('原认证机构名称', '中国质量认证中心有限公司'),
                ('原认证证书编号', '00123IS20134R0S/1100'),
                ('原证书到期时间', '2026-04-10'),
                ('拟转换的体系类型', '质量管理体系 (ISO 9001:2015)'),
                ('转换申请主要原因', '因公司业务发展需要，申请转换为博创众诚颁发之认证证书')
            ]),
            ('heading', '【正式转换声明条款】'),
            ('paragraph', '我公司目前持有 中国质量认证中心有限公司 颁发的 ISO 9001:2015 质量管理体系认证证书（证书号：00123IS20134R0S/1100，有效期至2026年04月10日）。因公司业务发展需要，特向博创众诚（北京）认证服务有限公司提出转换认证机构申请。', False, 'left', True),
            ('paragraph', '我公司郑重声明：原证书状态正常，不存在暂停、撤销或尚在整改中的严重不合格项。我公司自愿接受贵机构对原证书的合规复核及监督审核。', False, 'left', True),
            ('paragraph', '申请组织（盖章）： ***公司', True, 'right'),
            ('paragraph', '法定代表人（签字）： 姜楠楠', False, 'right'),
            ('paragraph', '声明日期： 2026年01月18日', False, 'right')
        ]
    ),
    (
        "BCZC-RC-02-A1 信息安全及信息技术服务保密协议.docx",
        "信息安全及信息技术服务双向保密协议",
        "博创众诚（北京）认证服务有限公司",
        [
            ('paragraph', '甲方（委托方）： ***公司', True),
            ('paragraph', '乙方（受托方）： 北京中轻质量认证中心有限公司', True),
            ('paragraph', '鉴于双方在管理体系认证审核过程中涉及商业机密、技术数据及信息系统安全，特签订本双向保密协议：', False, 'left', True),
            ('bullet_list', [
                '乙方审核组人员及专家对在审核过程中知悉的甲方任何软件源代码、经营数据、技术方案负有终身保密义务。',
                '未经甲方书面许可，乙方不得将甲方敏感数据及信息资产披露或转让给任何第三方。',
                '本协议一式两份，与主认证合同具有同等法律效力。'
            ]),
            ('paragraph', '甲方（盖章）： ***公司', True, 'left'),
            ('paragraph', '乙方（盖章）： 北京中轻质量认证中心有限公司', True, 'right')
        ]
    ),
    (
        "申请书附件1：管理体系覆盖总部 分支机构信息表.docx",
        "申请书附件1：管理体系覆盖总部与分支机构信息表",
        "按各分支机构与场地实际情况填报",
        [
            ('table',
             ['分支机构/分场所名称', '分支机构地址', '覆盖人数', '活动与服务职能'],
             [
                 ['总部（总厂）', '河北省沧州市任丘市经济技术开发区', '30 人', '整体运营、研发与生产管理'],
                 ['第一分支机构/研发中心', '河北省石家庄市高新技术产业开发区', '20 人', '软件研发与技术客服']
             ]
            )
        ]
    ),
    (
        "申请书附件2：多经营地址信息表.docx",
        "申请书附件2：多经营地址信息表",
        "多经营场地及研发中心明细",
        [
            ('key_value_table', [
                ('地址一（主经营生产地）', '河北省沧州市任丘市经济技术开发区'),
                ('地址二（研发中心）', '河北省石家庄市高新技术产业开发区'),
                ('场地产权及租赁性质', '自有产权 / 租赁场地（已提供有效租赁合同）')
            ])
        ]
    ),
    (
        "申请书附件3：临时场所及服务项目清单.docx",
        "申请书附件3：临时场所及工程服务项目清单",
        "工程现场与临时服务项目备案",
        [
            ('table',
             ['序号', '工程项目/临时现场名称', '现场具体地址', '服务内容', '距离(km)', '开工日期', '竣工日期', '施工阶段', '现场人数'],
             [
                 ['01', '***公司电力工程与检测服务项目', '河北省沧州市任丘市经济技术开发区', '高低压开关柜组装与施工现场', '15', '2025-01-01', '2025-12-31', '施工阶段', '50']
             ]
            )
        ]
    ),
    (
        "申请书附件4：保密和敏感信息声明表.docx",
        "申请书附件4：保密和敏感信息声明表",
        "敏感资产与保密级别填报",
        [
            ('heading', '【敏感数据及保密级别声明】'),
            ('bullet_list', [
                '商业机密与客户核心数据隔离防护措施已就绪',
                '现场审核人员数据保密协议签订与授权约束',
                '敏感网络区域及核心机房审核访问限制提示'
            ])
        ]
    ),
    (
        "申请书附件5：信息安全管理体系认证客户基本信息.docx",
        "申请书附件5：信息安全管理体系(ISMS)客户基本信息",
        "信息安全基础设施与等保情况",
        [
            ('key_value_table', [
                ('信息系统服务器数量', '云服务器/物理服务器台数'),
                ('核心数据库类型', 'MySQL / Oracle / PostgreSQL'),
                ('网络安全防护级别', '等保三级 / 等保二级'),
                ('信息安全专职人员', '专职安全员人数')
            ])
        ]
    ),
    (
        "申请书附件6：产品或提供服务清单.docx",
        "申请书附件6：产品或提供服务清单",
        "认证覆盖产品与服务明细表",
        [
            ('table',
             ['序号', '产品/服务名称', '规格型号', '认证覆盖范围'],
             [
                 ['1', '高低压开关柜、配电箱、电力变压器', '通用型 / 专业型', '组装、生产及销售及相关管理活动'],
                 ['2', '电力设备及系统软件运维服务', '标准型', '电力设备及系统软件运维服务']
             ]
            )
        ]
    ),
    (
        "申请书附件6：信息技术服务管理体系相关的风险评价表.docx",
        "申请书附件6：信息技术服务管理体系(ITSMS)风险评价表",
        "运维服务与SLA风险评估",
        [
            ('key_value_table', [
                ('IT服务运维风险项', '风险等级与处置策略'),
                ('SLA服务级别指标', '系统可用性 99.9% / 故障响应时间'),
                ('应急预案演练频次', '每年至少 1 次演练')
            ])
        ]
    ),
    (
        "申请书附件7：产品或提供服务清单.docx",
        "申请书附件7：产品或提供服务清单",
        "产品与服务范围备案明细",
        [
            ('table',
             ['序号', '产品/服务名称', '规格型号', '认证覆盖范围'],
             [
                 ['1', '高低压开关柜、配电箱、电力变压器', '通用型', '组装、生产及销售及相关管理活动'],
                 ['2', '电力设备及系统软件运维服务', '专业型', '电力设备及系统软件运维服务']
             ]
            )
        ]
    ),
    (
        "申请书附件8：能源管理体系信息表.docx",
        "申请书附件8：能源管理体系(EnMS)信息表",
        "综合能耗与主要耗能设备",
        [
            ('key_value_table', [
                ('主要能源消耗品种', '电力 / 天然气 / 煤炭'),
                ('年综合能耗总量', '折合标准煤（吨）'),
                ('主要耗能设备清单', '高耗能设备台数及功率')
            ])
        ]
    ),
    (
        "申请书附件9：体系覆盖有效人数信息表.docx",
        "申请书附件9：体系覆盖有效人数信息表",
        "岗位与全职兼职人员配置",
        [
            ('key_value_table', [
                ('部门/岗组', '全职人数'),
                ('研发与管理人员', '20 人'),
                ('生产与运维服务人员', '30 人'),
                ('合计有效覆盖人数', '50 人')
            ])
        ]
    ),
    (
        "申请书附件10：人工智能管理体系认证客户基本信息.docx",
        "申请书附件10：人工智能管理体系(AIMS)客户基本信息",
        "AI算法与数据隐私评估",
        [
            ('key_value_table', [
                ('AI算法/大模型名称', '自研算法模型与训练数据集'),
                ('算法安全与伦理评估', '已完成算法备案与偏见测试'),
                ('数据隐私保护机制', '数据脱敏与加密存储')
            ])
        ]
    ),
    (
        "申请书附件11：食品类管理体系认证信息表.docx",
        "申请书附件11：食品类管理体系(FSMS/HACCP)信息表",
        "关键控制点(CCP)与卫生许苛",
        [
            ('key_value_table', [
                ('食品生产许可证编号', 'SCxxxxxxxxxxxxxx'),
                ('关键控制点(CCP)数量', 'CCP1, CCP2 关键限值控制'),
                ('食品安全管理人员', '专职食品安全员姓名及资质')
            ])
        ]
    ),
    (
        "申请书附件12：InMS研发项目清单.docx",
        "申请书附件12：创新管理体系(InMS)研发项目清单",
        "研发管线与专利成果清单",
        [
            ('key_value_table', [
                ('研发项目名称', '研发管线及专利成果'),
                ('项目一', '智能电网高精度监测软件系统研发'),
                ('项目二', '基于AI的大模型知识产权防护平台')
            ])
        ]
    )
]

force_overwrite = '--force' in sys.argv

for filename, title, subtitle, sections in templates_spec:
    filepath = os.path.join(TEMPLATES_DIR, filename)
    if not force_overwrite and os.path.exists(filepath):
        print(f"Skipping existing template to protect user uploaded files: {filename}")
        continue
    file_data = create_docx(title, subtitle, sections)
    with open(filepath, 'wb') as f:
        f.write(file_data)
    print(f"Generated high-fidelity DOCX template: {filename} ({len(file_data)} bytes)")
