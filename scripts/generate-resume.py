"""Generate a two-page resume from the site's actual public JSON, inside Docker.

docker run --rm -i -v "$PWD:/src:ro" -v "$PWD/public/downloads:/out" \
  -v '/System/Library/Fonts/STHeiti Light.ttc:/font.ttc:ro' \
  python:3.12-slim sh -ec 'pip install -q reportlab; python /src/scripts/generate-resume.py'

Input: public content JSON on stdin. Output: /out/resume-cn.pdf (or --output).
"""
import argparse
import json
import re
import sys
from pathlib import Path
from xml.sax.saxutils import escape, quoteattr

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import HRFlowable, KeepTogether, PageBreak, Paragraph, SimpleDocTemplate, Spacer

parser = argparse.ArgumentParser()
parser.add_argument('--output', default='/out/resume-cn.pdf')
parser.add_argument('--font', default='/font.ttc')
args = parser.parse_args()
data = json.load(sys.stdin)
if 'result' in data:
    data = data['result']['data']['json']
profile = data['profile']
experiences = data['experiences']
projects = data['projects']
if re.search(r'lora|dreambooth', json.dumps(data, ensure_ascii=False), re.I):
    raise ValueError('Update public content before generating the resume.')

pdfmetrics.registerFont(TTFont('ResumeCN', args.font, subfontIndex=0))
ink = colors.HexColor('#132a35')
muted = colors.HexColor('#415560')
accent = colors.HexColor('#16718a')
line = colors.HexColor('#c5d7de')

def style(name, size=10.5, leading=16, color=ink, before=0, after=7):
    return ParagraphStyle(name, fontName='ResumeCN', fontSize=size, leading=leading,
                          textColor=color, spaceBefore=before, spaceAfter=after,
                          alignment=TA_LEFT, wordWrap='CJK', allowWidows=0, allowOrphans=0)

body = style('body')
small = style('small', 9.5, 15, muted)
heading = style('heading', 12.5, 19, accent, 13, 9)
case_title = style('case_title', 12, 18, ink, 0, 5)
role = style('role', 9.5, 15, accent, 0, 6)
bullet = style('bullet', 10.5, 16, muted, 0, 5)
story = []

def p(text, which=body):
    return Paragraph(escape(str(text)).replace('\n', '<br/>'), which)

def section(title):
    story.extend([p(title, heading), HRFlowable(width='100%', thickness=.5, color=line, spaceAfter=9)])

def entry(title, meta, summary, details=(), url=None):
    items = [p(title, case_title), p(meta, role), p(summary, body)]
    items.extend(p('· ' + item, bullet) for item in details)
    if url and re.match(r'^https?://', url):
        items.append(Paragraph('<link href=' + quoteattr(url) + ' color="#16718a"><u>访问项目网站</u></link>', small))
    items.append(Spacer(1, 7))
    story.append(KeepTogether(items))

story.extend([
    p(profile['fullName'], style('name', 27, 35, ink, 0, 8)),
    p(profile['role'] + '  /  ' + profile['englishName'], style('identity', 12, 19, accent, 0, 8)),
    p(profile['location'] + '  ·  ' + profile['email'], small),
    Spacer(1, 8),
    p(profile['headline'], style('thesis', 17, 25, ink, 0, 10)),
    p(profile['introduction'], body),
])
section('当前工作')
current = experiences[0]
entry(current['company'], current['role'] + '  ·  ' + current['period'], current['summary'], [current['achievements'][-1]])

section('近期产品实践')
for project in projects[:2]:
    entry(project['title'], project['subtitle'], project['description'], url=project.get('demoUrl'))

section('能力与工作方式')
for group in ['Agent 协作', 'AI 产品', '工程实现', 'AI 工作流']:
    items = [s.split('｜', 1)[1] for s in profile['skills'] if s.startswith(group + '｜')]
    if items:
        story.append(p(group + '  /  ' + ' · '.join(items), small))

story.append(PageBreak())
story.extend([p('职业经历与设计积累', style('page_title', 21, 30, ink, 0, 8)), p('从界面与品牌设计，到 AI 产品规划与实际交付。', small)])
for experience in experiences[1:]:
    # The full experience remains on the site; the PDF keeps one representative contribution.
    entry(experience['company'], experience['role'] + '  ·  ' + experience['period'], experience['summary'], experience['achievements'][:1])

section('教育背景')
story.append(p('\n'.join(profile['education'].split('\n')[:2]), body))

def chrome(canvas, doc):
    canvas.saveState()
    width, height = A4
    canvas.setStrokeColor(line)
    canvas.setLineWidth(.5)
    canvas.line(44, 41, width-44, 41)
    canvas.setFont('ResumeCN', 8)
    canvas.setFillColor(muted)
    canvas.drawString(44, 27, profile['fullName'] + ' · ' + profile['role'])
    canvas.drawRightString(width-44, 27, str(doc.page) + ' / 2')
    canvas.restoreState()

output = Path(args.output)
output.parent.mkdir(parents=True, exist_ok=True)
document = SimpleDocTemplate(str(output), pagesize=A4, rightMargin=44, leftMargin=44,
                             topMargin=40, bottomMargin=57, title=profile['fullName']+' · '+profile['role'],
                             author=profile['fullName'], pageCompression=1)
document.build(story, onFirstPage=chrome, onLaterPages=chrome)
print(f'Generated {output}', file=sys.stderr)
