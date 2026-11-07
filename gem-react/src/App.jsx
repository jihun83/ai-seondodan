// 보석 맞추기 (리액트 판) — 화면과 진행
// 규칙은 logic.js, 그림은 Gem.jsx에 있다.
// 애니메이션이 이어지는 비동기 흐름에서 최신 판을 읽어야 해서, 판 상태는 useRef에 두고
// 바뀔 때마다 redraw()로 다시 그린다. 점수·시간처럼 화면 숫자는 useState로 둔다.
import { useEffect, useReducer, useRef, useState } from 'react'
import {
  N, GAME_SEC, freshTypes, findMatches, findMove, collapse, scoreFor, swapGrid, typesOf, randType,
} from './logic.js'
import Gem, { GemDefs } from './Gem.jsx'

export const VERSION = '2.0'

const sleep = ms => new Promise(res => setTimeout(res, ms))
const calcCell = () => Math.floor((Math.min(window.innerWidth - 32, 560) - 16) / N)
function loadBest() {
  try { return Number(localStorage.getItem('gem-best')) || 0 } catch { return 0 }
}
function saveBest(v) {
  try { localStorage.setItem('gem-best', String(v)) } catch { /* 저장 못 해도 게임은 계속 */ }
}

export default function App() {
  const [, redraw] = useReducer(x => x + 1, 0)
  const [cell, setCell] = useState(calcCell)
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(loadBest)
  const [timeLeft, setTimeLeft] = useState(GAME_SEC)
  const [over, setOver] = useState(null)      // { score, newBest }
  const [floats, setFloats] = useState([])    // [{ id, text }]
  const [noAnim, setNoAnim] = useState(false) // 창 크기 바뀔 때 움직임 끄기

  const st = useRef({
    grid: [], popping: new Set(), hint: new Set(), selected: null,
    busy: false, playing: false, score: 0, best: loadBest(), time: GAME_SEC,
    gameNo: 0, nextId: 1, timer: null, hintTimer: null, drag: null, cell: calcCell(),
  }).current

  // ---------- 작은 도우미 ----------
  const addScore = d => { st.score = Math.max(0, st.score + d); setScore(st.score) }
  const floatText = text => {
    const id = st.nextId++
    setFloats(f => [...f, { id, text }])
    setTimeout(() => setFloats(f => f.filter(x => x.id !== id)), 1000)
  }
  const clearHint = () => { clearTimeout(st.hintTimer); st.hint = new Set() }
  const findById = id => st.grid.flat().find(g => g.id === id)

  // ---------- 진행 ----------
  async function resolve(m, my) {
    let combo = 1
    while (m.cells.length) {
      st.popping = new Set(m.cells.map(([r, c]) => st.grid[r][c].id))
      addScore(scoreFor(m.cells.length, combo))
      if (combo > 1) floatText(`콤보 x${combo}!`)
      else if (m.square) floatText('사각형!')
      else if (m.cells.length >= 5) floatText('대단해요!')
      redraw()
      await sleep(220)
      if (my !== st.gameNo) return
      const holes = st.grid.map(row => row.map(g => (st.popping.has(g.id) ? null : g)))
      const res = collapse(holes, () => ({ id: st.nextId++, t: randType() }))
      st.grid = res.grid
      st.popping = new Set()
      redraw()
      await sleep(res.maxDur * 1000 + 40)
      if (my !== st.gameNo) return
      m = findMatches(typesOf(st.grid))
      combo++
    }
    if (!findMove(typesOf(st.grid))) {
      floatText('섞는 중…')
      await sleep(500)
      if (my !== st.gameNo) return
      const t = freshTypes()
      st.grid = st.grid.map(row => row.map(g => ({ ...g, t: t[g.r][g.c], dur: undefined })))
      redraw()
      await sleep(300)
    }
  }

  async function trySwap(p, q) {
    if (st.busy || !st.playing) return
    if (Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]) !== 1) return
    st.busy = true
    const my = st.gameNo
    clearHint()
    st.grid = swapGrid(st.grid, p, q)
    redraw()
    await sleep(230)
    if (my !== st.gameNo) return
    const m = findMatches(typesOf(st.grid))
    if (m.cells.length === 0) {
      st.grid = swapGrid(st.grid, p, q) // 줄이 안 생기면 되돌린다
      redraw()
      await sleep(230)
    } else {
      await resolve(m, my)
    }
    if (my === st.gameNo) { st.busy = false; redraw() }
  }

  function showHint() {
    if (st.busy || !st.playing) return
    const mv = findMove(typesOf(st.grid))
    if (!mv) return
    clearHint()
    addScore(-50)
    st.hint = new Set(mv.map(([r, c]) => st.grid[r][c].id))
    st.hintTimer = setTimeout(() => { st.hint = new Set(); redraw() }, 2200)
    redraw()
  }

  async function endGame() {
    clearInterval(st.timer)
    st.playing = false
    st.selected = null
    clearHint()
    redraw()
    const my = st.gameNo
    while (st.busy) { await sleep(50); if (my !== st.gameNo) return } // 연쇄가 끝난 뒤 점수 확정
    const newBest = st.score > st.best
    if (newBest) { st.best = st.score; setBest(st.best); saveBest(st.best) }
    setOver({ score: st.score, newBest })
  }

  function tick() {
    st.time = Math.max(0, st.time - 0.1)
    setTimeLeft(st.time)
    if (st.time <= 0) endGame()
  }

  function newGame() {
    st.gameNo++
    clearInterval(st.timer)
    clearHint()
    st.busy = false
    st.drag = null
    st.selected = null
    st.popping = new Set()
    const t = freshTypes()
    st.grid = t.map((row, r) => row.map((x, c) => ({ id: st.nextId++, t: x, r, c, fromRow: r - N, dur: 0.35 + r * 0.03 })))
    st.score = 0
    setScore(0)
    st.time = GAME_SEC
    setTimeLeft(GAME_SEC)
    setOver(null)
    st.playing = true
    st.timer = setInterval(tick, 100)
    redraw()
  }

  // ---------- 입력: 끌기 + 두 번 누르기 ----------
  function onPointerDown(e) {
    const el = e.target.closest('.gem')
    if (!el || st.busy || !st.playing) return
    st.drag = { id: Number(el.dataset.id), x: e.clientX, y: e.clientY }
  }

  useEffect(() => {
    function onMove(e) {
      if (!st.drag) return
      const dx = e.clientX - st.drag.x
      const dy = e.clientY - st.drag.y
      if (Math.max(Math.abs(dx), Math.abs(dy)) < st.cell * 0.35) return
      const g = findById(st.drag.id)
      st.drag = null
      st.selected = null
      if (!g) return
      let { r, c } = g
      if (Math.abs(dx) > Math.abs(dy)) c += dx > 0 ? 1 : -1
      else r += dy > 0 ? 1 : -1
      if (r >= 0 && r < N && c >= 0 && c < N) trySwap([g.r, g.c], [r, c])
      redraw()
    }
    function onUp() {
      if (!st.drag) return
      const g = findById(st.drag.id)
      st.drag = null
      if (!g) return
      const a = st.selected !== null ? findById(st.selected) : null
      if (!a) st.selected = g.id
      else if (a.id === g.id) st.selected = null
      else if (Math.abs(a.r - g.r) + Math.abs(a.c - g.c) === 1) { st.selected = null; trySwap([a.r, a.c], [g.r, g.c]) }
      else st.selected = g.id
      redraw()
    }
    function onResize() {
      st.cell = calcCell()
      setNoAnim(true)
      setCell(st.cell)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('resize', onResize)
    newGame()
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('resize', onResize)
      clearInterval(st.timer)
      clearTimeout(st.hintTimer)
      st.gameNo++ // 진행 중이던 비동기 흐름을 멈춘다
    }
    // 처음 한 번만 연결. 함수들은 st(useRef)만 읽으므로 다시 만들 필요가 없다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 크기 바뀐 뒤 다음 화면부터 움직임을 다시 켠다
  useEffect(() => {
    if (!noAnim) return
    const id = requestAnimationFrame(() => setNoAnim(false))
    return () => cancelAnimationFrame(id)
  }, [noAnim])

  // ---------- 화면 ----------
  return (
    <div className="wrap" style={{ '--cell': `${cell}px` }}>
      <GemDefs />
      <h1>💎 보석 맞추기<small>v{VERSION} · 리액트</small></h1>
      <div className="hud">
        <div className="stat"><span>점수</span><b>{score}</b></div>
        <div className="stat"><span>최고</span><b>{best}</b></div>
        <div className="stat"><span>남은 시간</span><b>{Math.ceil(timeLeft)}</b></div>
      </div>
      <div className={`timebar${timeLeft <= 10 ? ' low' : ''}`}>
        <div style={{ width: `${(timeLeft / GAME_SEC) * 100}%` }} />
      </div>
      <div className="board" onPointerDown={onPointerDown}>
        <div className={`layer${noAnim ? ' noanim' : ''}`}>
          {st.grid.flat().map(g => (
            <Gem
              key={g.id}
              gem={g}
              cell={cell}
              selected={st.selected === g.id}
              hint={st.hint.has(g.id)}
              popping={st.popping.has(g.id)}
            />
          ))}
        </div>
        {floats.map(f => <div key={f.id} className="float">{f.text}</div>)}
        {over && (
          <div className="over">
            <h2>시간 종료!</h2>
            <p>점수 {over.score}점{over.newBest ? ' · 최고 기록!' : ''}</p>
            <button type="button" onClick={newGame}>다시 하기</button>
          </div>
        )}
      </div>
      <div className="btns">
        <button type="button" className="alt" onClick={showHint}>💡 힌트 (-50점)</button>
        <button type="button" onClick={newGame}>🔄 새 게임</button>
      </div>
      <div className="help">
        이웃한 보석을 끌거나 두 번 눌러 자리를 바꾸세요.<br />
        같은 보석 3개 이상을 줄 세우거나 2×2 사각형으로 모으면 사라집니다. 연쇄되면 콤보 점수!
      </div>
    </div>
  )
}
