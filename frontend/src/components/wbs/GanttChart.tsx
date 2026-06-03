import { useRef, useMemo, useState } from 'react';
import { Tooltip, Tag, Empty, Space, Button } from 'antd';
import { FlagFilled } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import type { Task } from '../../types';

/* ── 상수 ─────────────────────────────────────────── */
const LEFT_W   = 280;   // 좌측 패널 너비
const ROW_H    = 34;    // 행 높이
const HEADER_H = 56;    // 날짜 헤더 높이 (월 + 주)

const ZOOM_LEVELS = [
  { label: '일간',   dayPx: 28 },
  { label: '주간',   dayPx: 14 },
  { label: '월간',   dayPx:  6 },
];

/* ── 타입 ─────────────────────────────────────────── */
interface FlatRow {
  task: Task;
  depth: number;
  isParent: boolean;
}

/* ── 유틸 ─────────────────────────────────────────── */
function flattenTasks(tasks: Task[]): FlatRow[] {
  const childOf = new Set(tasks.map(t => t.parentId).filter(Boolean));
  const rows: FlatRow[] = [];

  function walk(parentId: number | null, depth: number) {
    tasks
      .filter(t => t.parentId === parentId)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .forEach(t => {
        rows.push({ task: t, depth, isParent: childOf.has(t.id) });
        walk(t.id, depth + 1);
      });
  }

  walk(null, 0);
  return rows;
}

function getRange(tasks: Task[]): { start: Dayjs; end: Dayjs } {
  const dated = tasks.filter(t => t.planStart && t.planEnd);
  if (dated.length === 0) {
    return {
      start: dayjs().startOf('month'),
      end: dayjs().add(4, 'month').endOf('month'),
    };
  }
  const starts = dated.map(t => dayjs(t.planStart!));
  const ends   = dated.map(t => dayjs(t.planEnd!));
  const min = starts.reduce((a, b) => a.isBefore(b) ? a : b);
  const max = ends.reduce((a, b)   => a.isAfter(b)  ? a : b);
  return {
    start: min.subtract(1, 'week').startOf('week'),
    end:   max.add(1, 'week').endOf('week'),
  };
}

function getBarColor(task: Task, isParent: boolean): string {
  if (task.progress >= 100) return '#00C875';
  if (isParent) return '#6E9BD1';
  const today = dayjs();
  if (task.planEnd && dayjs(task.planEnd).isBefore(today) && task.progress < 100) return '#E44258';
  return '#0073EA';
}

/* ── 날짜 헤더 계산 ────────────────────────────────── */
interface MonthCell { label: string; left: number; width: number }
interface WeekCell  { label: string; left: number; width: number; isToday: boolean }

function buildHeaders(rangeStart: Dayjs, totalDays: number, dayPx: number) {
  const months: MonthCell[] = [];
  const weeks: WeekCell[]   = [];

  let cur = rangeStart.startOf('month');
  while (cur.isBefore(rangeStart.add(totalDays, 'day'))) {
    const s = cur.isBefore(rangeStart) ? rangeStart : cur;
    const e = cur.endOf('month');
    const end = e.isAfter(rangeStart.add(totalDays - 1, 'day'))
      ? rangeStart.add(totalDays - 1, 'day') : e;
    months.push({
      label: cur.format('YYYY년 M월'),
      left:  s.diff(rangeStart, 'day') * dayPx,
      width: (end.diff(s, 'day') + 1) * dayPx,
    });
    cur = cur.add(1, 'month').startOf('month');
  }

  let week = rangeStart.startOf('week');
  const today = dayjs();
  while (week.isBefore(rangeStart.add(totalDays, 'day'))) {
    const s = week.isBefore(rangeStart) ? rangeStart : week;
    const e = week.endOf('week');
    const end = e.isAfter(rangeStart.add(totalDays - 1, 'day'))
      ? rangeStart.add(totalDays - 1, 'day') : e;
    weeks.push({
      label:   s.format('D'),
      left:    s.diff(rangeStart, 'day') * dayPx,
      width:   (end.diff(s, 'day') + 1) * dayPx,
      isToday: today.isSame(s, 'week'),
    });
    week = week.add(1, 'week');
  }

  return { months, weeks };
}

/* ═══════════════════════════════════════════════════
   GanttChart
═══════════════════════════════════════════════════ */
export default function GanttChart({ tasks }: { tasks: Task[] }) {
  const [zoomIdx, setZoomIdx] = useState(1);
  const dayPx   = ZOOM_LEVELS[zoomIdx].dayPx;
  const bodyRef = useRef<HTMLDivElement>(null);
  const leftRef = useRef<HTMLDivElement>(null);

  const rows    = useMemo(() => flattenTasks(tasks), [tasks]);
  const { start: rangeStart, end: rangeEnd } = useMemo(() => getRange(tasks), [tasks]);
  const totalDays  = rangeEnd.diff(rangeStart, 'day') + 1;
  const totalWidth = totalDays * dayPx;
  const today      = dayjs();
  const todayLeft  = today.diff(rangeStart, 'day') * dayPx;
  const todayVisible = todayLeft >= 0 && todayLeft <= totalWidth;
  const { months, weeks } = useMemo(
    () => buildHeaders(rangeStart, totalDays, dayPx),
    [rangeStart, totalDays, dayPx],
  );

  function syncScroll(e: React.UIEvent<HTMLDivElement>) {
    if (leftRef.current) leftRef.current.scrollTop = e.currentTarget.scrollTop;
  }

  if (tasks.length === 0) {
    return <Empty description="공정이 없습니다." style={{ padding: 60 }} />;
  }

  const datedCount = tasks.filter(t => t.planStart && t.planEnd).length;
  const bodyHeight = `calc(100vh - 440px)`;

  return (
    <div>
      {/* 줌 컨트롤 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          {datedCount < tasks.length && (
            <Tag color="warning">일정 미설정 {tasks.length - datedCount}개 공정은 표시되지 않습니다.</Tag>
          )}
        </div>
        <Space>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>보기 단위:</span>
          {ZOOM_LEVELS.map((z, i) => (
            <Button
              key={z.label}
              size="small"
              type={i === zoomIdx ? 'primary' : 'default'}
              onClick={() => setZoomIdx(i)}
              style={{ borderRadius: 6 }}
            >
              {z.label}
            </Button>
          ))}
        </Space>
      </div>

      {/* 간트 차트 본체 */}
      <div style={{
        display: 'flex',
        border: '1px solid var(--border)',
        borderRadius: 10,
        overflow: 'hidden',
        background: '#fff',
        boxShadow: 'var(--shadow-sm)',
      }}>

        {/* ── 좌측: 공정명 패널 ──────────────────── */}
        <div style={{ width: LEFT_W, flexShrink: 0, borderRight: '1px solid var(--border)', zIndex: 10 }}>
          {/* 헤더 */}
          <div style={{
            height: HEADER_H,
            background: '#F8F9FB',
            borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center',
            padding: '0 14px',
          }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.04em' }}>
              WBS / 공정명
            </span>
          </div>
          {/* 행 목록 */}
          <div
            ref={leftRef}
            style={{ height: bodyHeight, overflowY: 'hidden' }}
          >
            {rows.map(({ task, depth, isParent }) => (
              <div key={task.id} style={{
                height: ROW_H,
                display: 'flex', alignItems: 'center',
                paddingLeft: 10 + depth * 14,
                borderBottom: '1px solid #F2F4F7',
                gap: 6,
                background: isParent ? '#F8FBFF' : '#fff',
              }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 38, flexShrink: 0 }}>
                  {task.wbsNumber}
                </span>
                {task.isMilestone && (
                  <FlagFilled style={{ color: '#FF8B00', fontSize: 10, flexShrink: 0 }} />
                )}
                <span style={{
                  fontSize: 12,
                  fontWeight: isParent ? 700 : 400,
                  color: isParent ? '#172B4D' : '#344054',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {task.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── 우측: 타임라인 패널 ─────────────────── */}
        <div
          ref={bodyRef}
          style={{ flex: 1, overflow: 'auto', height: `calc(${bodyHeight} + ${HEADER_H}px)` }}
          onScroll={syncScroll}
        >
          <div style={{ width: totalWidth, position: 'relative', minWidth: '100%' }}>

            {/* 날짜 헤더 (sticky) */}
            <div style={{
              height: HEADER_H,
              background: '#F8F9FB',
              borderBottom: '1px solid var(--border)',
              position: 'sticky', top: 0, zIndex: 10,
            }}>
              {/* 월 헤더 */}
              <div style={{ height: 28, position: 'relative', borderBottom: '1px solid #EAECF0' }}>
                {months.map(m => (
                  <div key={m.label + m.left} style={{
                    position: 'absolute', left: m.left, width: m.width, height: '100%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)',
                    borderRight: '1px solid #EAECF0',
                    overflow: 'hidden',
                  }}>
                    {m.width > 40 ? m.label : ''}
                  </div>
                ))}
              </div>
              {/* 주 헤더 */}
              <div style={{ height: 28, position: 'relative' }}>
                {weeks.map(w => (
                  <div key={w.label + w.left} style={{
                    position: 'absolute', left: w.left, width: w.width, height: '100%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, color: w.isToday ? 'var(--primary)' : 'var(--text-muted)',
                    fontWeight: w.isToday ? 700 : 400,
                    borderRight: '1px solid #F2F4F7',
                    background: w.isToday ? 'rgba(0,115,234,0.05)' : undefined,
                  }}>
                    {w.width > 18 ? w.label : ''}
                  </div>
                ))}
              </div>
            </div>

            {/* 오늘 선 */}
            {todayVisible && (
              <div style={{
                position: 'absolute',
                left: todayLeft + 1,
                top: HEADER_H,
                width: 2,
                height: rows.length * ROW_H,
                background: '#E44258',
                zIndex: 5,
                pointerEvents: 'none',
              }}>
                <div style={{
                  position: 'absolute', top: -16, left: -18,
                  background: '#E44258', color: '#fff',
                  fontSize: 10, fontWeight: 700,
                  padding: '1px 5px', borderRadius: 4,
                  whiteSpace: 'nowrap',
                }}>
                  오늘
                </div>
              </div>
            )}

            {/* 태스크 행 */}
            {rows.map(({ task, isParent }, idx) => {
              const hasDate = task.planStart && task.planEnd;
              const barStart = hasDate ? dayjs(task.planStart!).diff(rangeStart, 'day') * dayPx : 0;
              const barDays  = hasDate ? dayjs(task.planEnd!).diff(dayjs(task.planStart!), 'day') + 1 : 0;
              const barWidth = barDays * dayPx;
              const color    = getBarColor(task, isParent);
              const pct      = Math.round(task.progress);

              return (
                <div key={task.id} style={{
                  height: ROW_H,
                  borderBottom: '1px solid #F2F4F7',
                  position: 'relative',
                  background: idx % 2 === 0
                    ? (isParent ? '#F4F8FF' : '#FAFAFA')
                    : '#fff',
                }}>
                  {/* 주별 세로 구분선 */}
                  {weeks.map(w => (
                    <div key={w.left} style={{
                      position: 'absolute', left: w.left, top: 0,
                      width: 1, height: '100%',
                      background: '#F2F4F7',
                      pointerEvents: 'none',
                    }} />
                  ))}

                  {/* 간트 바 */}
                  {hasDate && barWidth > 0 && (
                    <Tooltip
                      title={
                        <div style={{ fontSize: 12 }}>
                          <div style={{ fontWeight: 700, marginBottom: 4 }}>
                            {task.wbsNumber} {task.name}
                          </div>
                          <div>시작: {task.planStart}</div>
                          <div>종료: {task.planEnd}</div>
                          <div>진척도: {pct}%</div>
                          {task.assignee && <div>담당자: {task.assignee.name}</div>}
                        </div>
                      }
                      placement="top"
                    >
                      <div style={{
                        position: 'absolute',
                        left: barStart,
                        top: isParent ? 4 : 7,
                        width: barWidth,
                        height: isParent ? ROW_H - 8 : ROW_H - 14,
                        borderRadius: isParent ? 4 : 6,
                        background: color + '28',
                        border: `1.5px solid ${color}`,
                        overflow: 'hidden',
                        cursor: 'default',
                        zIndex: 2,
                      }}>
                        {/* 진척도 채우기 */}
                        <div style={{
                          width: `${pct}%`,
                          height: '100%',
                          background: color,
                          opacity: 0.75,
                          transition: 'width 0.3s',
                        }} />

                        {/* 바 안 텍스트 */}
                        {barWidth > 50 && (
                          <span style={{
                            position: 'absolute',
                            left: 5, top: '50%',
                            transform: 'translateY(-50%)',
                            fontSize: 10, fontWeight: 600,
                            color: '#fff',
                            whiteSpace: 'nowrap',
                            pointerEvents: 'none',
                          }}>
                            {pct > 0 ? `${pct}%` : task.name.slice(0, Math.floor(barWidth / 7))}
                          </span>
                        )}
                      </div>
                    </Tooltip>
                  )}

                  {/* 마일스톤 다이아몬드 */}
                  {task.isMilestone && hasDate && (
                    <div style={{
                      position: 'absolute',
                      left: barStart - 8,
                      top: '50%', transform: 'translateY(-50%) rotate(45deg)',
                      width: 14, height: 14,
                      background: '#FF8B00',
                      border: '2px solid #fff',
                      boxShadow: '0 0 0 1.5px #FF8B00',
                      zIndex: 3,
                    }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 범례 */}
      <div style={{
        display: 'flex', gap: 20, marginTop: 12,
        padding: '8px 14px', background: '#fff',
        borderRadius: 8, border: '1px solid var(--border)',
        width: 'fit-content',
      }}>
        {[
          { color: '#00C875', label: '완료 (100%)' },
          { color: '#0073EA', label: '진행 중' },
          { color: '#6E9BD1', label: '상위 공정' },
          { color: '#E44258', label: '지연' },
          { color: '#FF8B00', label: '마일스톤' },
          { color: '#E44258', label: '오늘', line: true },
        ].map(item => (
          <Space key={item.label} size={6}>
            {item.line ? (
              <div style={{ width: 3, height: 14, background: item.color, borderRadius: 2 }} />
            ) : item.label === '마일스톤' ? (
              <div style={{ width: 10, height: 10, background: item.color, transform: 'rotate(45deg)' }} />
            ) : (
              <div style={{ width: 20, height: 10, borderRadius: 3, background: item.color, opacity: 0.8 }} />
            )}
            <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{item.label}</span>
          </Space>
        ))}
      </div>
    </div>
  );
}
