import ExcelJS from 'exceljs';

export interface WBSImportRow {
  name: string;
  depth: number;
  note?: string;
  planStart?: string;
  planEnd?: string;
  assigneeName?: string;
  isMilestone: boolean;
}

// ── 날짜 셀 파싱 헬퍼 ────────────────────────────────
function parseDateCell(cell: ExcelJS.Cell): string | undefined {
  const v = cell.value;
  if (!v) return undefined;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v).trim();
  // YYYY-MM-DD 또는 YYYY/MM/DD
  const match = s.match(/(\d{4})[-/](\d{2})[-/](\d{2})/);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  return undefined;
}

// ── Excel 템플릿 다운로드 ─────────────────────────────
export async function downloadWBSTemplate(): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'AI-Mate PMS';
  wb.created = new Date();

  /* ── Sheet 1: 데이터 입력 ─────────────────────── */
  const ws = wb.addWorksheet('WBS 데이터');

  ws.columns = [
    { key: 'name',      width: 34 },
    { key: 'depth',     width: 14 },
    { key: 'note',      width: 22 },
    { key: 'planStart', width: 15 },
    { key: 'planEnd',   width: 15 },
    { key: 'assignee',  width: 13 },
    { key: 'milestone', width: 14 },
  ];

  /* 헤더 행 */
  ws.addRow([
    '공정명 *', '구분(depth) *', '비고',
    '계획 시작일', '계획 종료일', '담당자', '마일스톤(Y/N)',
  ]);
  const hdr = ws.getRow(1);
  hdr.height = 30;
  hdr.eachCell((cell: ExcelJS.Cell) => {
    cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A2840' } };
    cell.font   = { color: { argb: 'FFFFFFFF' }, bold: true, size: 11 };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: false };
    cell.border = { bottom: { style: 'medium', color: { argb: 'FF0073EA' } } };
  });

  /* 예시 데이터 */
  const samples: [string, number, string, string, string, string, string][] = [
    ['요구사항 분석',       1, '대공정',  '2026-02-03', '2026-03-15', '홍길동',  'N'],
    ['현황 인터뷰',         2, '',        '2026-02-03', '2026-02-20', '홍길동',  'N'],
    ['요구사항 분석서 작성', 2, '',        '2026-02-21', '2026-03-10', '김철수',  'N'],
    ['요구사항 확정',        2, '마일스톤', '2026-03-11', '2026-03-15', '',        'Y'],
    ['설계',                1, '대공정',   '2026-03-16', '2026-04-30', '',        'N'],
    ['기본 설계',            2, '',        '2026-03-16', '2026-04-10', '이영희',  'N'],
    ['DB 설계',              3, '',        '2026-03-16', '2026-03-30', '이영희',  'N'],
    ['화면 설계',            3, '',        '2026-03-31', '2026-04-10', '박민준',  'N'],
    ['상세 설계',            2, '',        '2026-04-11', '2026-04-30', '',        'N'],
  ];

  samples.forEach(([name, depth, note, ps, pe, assignee, ms]) => {
    const row = ws.addRow([name, depth, note, ps, pe, assignee, ms]);
    row.height = 22;
    row.getCell(1).alignment = { indent: (depth - 1) * 3 };
    row.getCell(2).alignment = { horizontal: 'center' };
    row.getCell(7).alignment = { horizontal: 'center' };

    if (depth === 1) {
      row.eachCell((c: ExcelJS.Cell) => {
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD6E4F7' } };
        c.font = { bold: true };
      });
    }
  });

  /* 셀 유효성 검사 */
  for (let r = 2; r <= 500; r++) {
    ws.getCell(`B${r}`).dataValidation = {
      type: 'whole', operator: 'between',
      formulae: ['1', '5'],
      showErrorMessage: true,
      errorTitle: '잘못된 값',
      error: 'depth는 1~5 사이 정수여야 합니다.',
    };
    ws.getCell(`G${r}`).dataValidation = {
      type: 'list', formulae: ['"Y,N"'],
      showErrorMessage: true,
      errorTitle: '잘못된 값', error: 'Y 또는 N 만 입력 가능합니다.',
    };
  }

  /* 헤더 고정 */
  ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 1, activeCell: 'A2' }];

  /* ── Sheet 2: 작성 안내 ──────────────────────── */
  const ws2 = wb.addWorksheet('📋 작성 안내');
  ws2.getColumn(1).width = 60;
  ws2.getColumn(2).width = 36;

  const guide: [string, string, boolean?][] = [
    ['AI-Mate PMS — WBS Excel 템플릿 작성 안내', '', true],
    ['', ''],
    ['■ 필수 입력 항목', '', true],
    ['공정명 *',         '공정/작업의 이름을 입력합니다.'],
    ['구분(depth) *',    '계층 단계: 1=대공정, 2=중공정, 3=소공정, 4=세부, 5=상세'],
    ['', ''],
    ['■ 선택 입력 항목', '', true],
    ['비고',             '참고 내용을 자유롭게 입력하세요.'],
    ['계획 시작/종료일', 'YYYY-MM-DD 형식. (예: 2026-02-03)'],
    ['담당자',           '시스템에 등록된 사용자의 정확한 이름을 입력하세요.'],
    ['마일스톤(Y/N)',     'Y 또는 N. 기본값 N.'],
    ['', ''],
    ['■ depth 계층 구조 예시', '', true],
    ['1  요구사항 분석  (depth 1 = 대공정)', ''],
    ['2    └─ 인터뷰      (depth 2 = 중공정, 요구사항 분석 하위)', ''],
    ['2    └─ 분석서 작성 (depth 2 = 중공정, 요구사항 분석 하위)', ''],
    ['3        └─ 기능 분석 (depth 3 = 소공정, 분석서 작성 하위)', ''],
    ['1  설계             (depth 1 = 대공정, 요구사항 분석과 동일 레벨)', ''],
    ['', ''],
    ['■ 주의 사항', '', true],
    ['1. 1행(헤더)은 절대 수정하지 마세요.', ''],
    ['2. 공정명이 비어있는 행은 건너뜁니다.', ''],
    ['3. depth 순서를 올바르게 입력해야 계층이 정확히 구성됩니다.', ''],
    ['4. 담당자 이름이 시스템에 없으면 미지정으로 처리됩니다.', ''],
  ];

  guide.forEach(([c1, c2, bold]) => {
    const row = ws2.addRow([c1, c2]);
    if (bold) {
      row.getCell(1).font = { bold: true, size: c1.startsWith('AI') ? 13 : 11 };
    }
    if (c1.startsWith('AI')) {
      row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A2840' } };
      row.getCell(1).font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 13 };
      row.height = 28;
    }
    row.getCell(2).font = { color: { argb: 'FF667085' }, size: 10 };
  });

  /* 다운로드 */
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'WBS_템플릿.xlsx';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── 업로드된 Excel 파싱 ─────────────────────────────
export async function parseWBSExcel(file: File): Promise<WBSImportRow[]> {
  const buffer = await file.arrayBuffer();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);

  const ws = wb.worksheets[0];
  const rows: WBSImportRow[] = [];

  ws.eachRow((row: ExcelJS.Row, rowNum: number) => {
    if (rowNum === 1) return;

    const name  = String(row.getCell(1).value ?? '').trim();
    const depth = parseInt(String(row.getCell(2).value ?? '').trim(), 10);

    if (!name || isNaN(depth)) return;

    rows.push({
      name,
      depth:        Math.max(1, Math.min(5, depth)),
      note:         String(row.getCell(3).value ?? '').trim() || undefined,
      planStart:    parseDateCell(row.getCell(4)),
      planEnd:      parseDateCell(row.getCell(5)),
      assigneeName: String(row.getCell(6).value ?? '').trim() || undefined,
      isMilestone:  String(row.getCell(7).value ?? '').trim().toUpperCase() === 'Y',
    });
  });

  return rows;
}
