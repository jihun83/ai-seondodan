// 보석 그림(SVG 7종)과 보석 한 칸
import { useLayoutEffect, useRef } from 'react'

const COLORS = [
  ['#ff8a8a', '#b3121f', '#7a0a14'], // 빨강
  ['#ffc46b', '#d0600c', '#8a3c05'], // 주황
  ['#fff59a', '#d4ad00', '#8a7000'], // 노랑
  ['#8dffa0', '#169a32', '#0b5c1d'], // 초록
  ['#9de2ff', '#1a6fd0', '#0d3f7a'], // 파랑
  ['#eaa8ff', '#8a24b8', '#4f0f6b'], // 보라
  ['#ffffff', '#a6aec0', '#5d6475'], // 하양
]

// [바깥 모양, 안쪽 면] — 둥근 사각, 육각, 마름모, 팔각, 브릴리언트 컷, 삼각, 원형
const SHAPES = [
  [<rect x="10" y="10" width="80" height="80" rx="16" />, <rect x="28" y="28" width="44" height="44" rx="6" />],
  [<polygon points="50,5 91,28 91,72 50,95 9,72 9,28" />, <polygon points="50,25 72,38 72,62 50,75 28,62 28,38" />],
  [<polygon points="50,4 96,50 50,96 4,50" />, <polygon points="50,26 74,50 50,74 26,50" />],
  [<polygon points="31,6 69,6 94,31 94,69 69,94 31,94 6,69 6,31" />, <polygon points="40,28 60,28 72,40 72,60 60,72 40,72 28,60 28,40" />],
  [<polygon points="24,12 76,12 96,38 50,94 4,38" />, <polygon points="34,22 66,22 76,38 50,72 24,38" />],
  [<polygon points="50,6 96,90 4,90" />, <polygon points="50,34 74,78 26,78" />],
  [<circle cx="50" cy="50" r="44" />, <polygon points="50,24 68,32 76,50 68,68 50,76 32,68 24,50 32,32" />],
]

// 모든 보석이 같이 쓰는 그라데이션. 화면에 한 번만 둔다.
export function GemDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <defs>
        <linearGradient id="hi" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".85" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        {COLORS.map((c, i) => (
          <linearGradient key={i} id={`g${i}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={c[0]} />
            <stop offset=".55" stopColor={c[1]} />
            <stop offset="1" stopColor={c[2]} />
          </linearGradient>
        ))}
      </defs>
    </svg>
  )
}

function GemSvg({ t }) {
  const [outer, inner] = SHAPES[t]
  return (
    <svg viewBox="0 0 100 100">
      <g fill={`url(#g${t})`} stroke={COLORS[t][2]} strokeWidth="3">{outer}</g>
      <g fill={COLORS[t][1]} opacity=".55">{inner}</g>
      <g fill="url(#hi)" opacity=".7">{inner}</g>
      <ellipse cx="36" cy="30" rx="10" ry="5" fill="#fff" opacity=".75" transform="rotate(-30 36 30)" />
    </svg>
  )
}

const at = (c, r, cell) => `translate(${c * cell}px,${r * cell}px)`

// 보석 한 칸. 새로 생긴 보석(fromRow 있음)은 판 위에서 떨어지며 나타난다.
export default function Gem({ gem, cell, selected, hint, popping }) {
  const ref = useRef(null)

  useLayoutEffect(() => {
    if (gem.fromRow === undefined) return
    const el = ref.current
    el.style.transition = 'none'
    el.style.transform = at(gem.c, gem.fromRow, cell)
    void el.offsetHeight // 시작 위치를 먼저 그리게 한다
    el.style.transition = ''
    el.style.transitionDuration = gem.dur ? `${gem.dur}s` : ''
    el.style.transform = at(gem.c, gem.r, cell)
    // 처음 나타날 때 한 번만 실행
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const cls = ['gem', selected && 'sel', hint && 'hint', popping && 'pop'].filter(Boolean).join(' ')
  return (
    <div
      ref={ref}
      className={cls}
      data-id={gem.id}
      style={{ transform: at(gem.c, gem.r, cell), transitionDuration: gem.dur ? `${gem.dur}s` : undefined }}
    >
      <GemSvg t={gem.t} />
    </div>
  )
}
