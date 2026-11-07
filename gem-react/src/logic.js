// 보석 맞추기 — 게임 규칙 (화면과 상관없는 순수 함수만 둔다)
// 판: grid[r][c] = { id, t, r, c, fromRow?, dur? }   t = 보석 종류(0~6)
// 종류 배열: t[r][c] = 0~6

export const N = 8          // 판 크기
export const TYPES = 7      // 보석 종류
export const GAME_SEC = 90  // 제한 시간(초)

export const randType = (rand = Math.random) => Math.floor(rand() * TYPES)

export const typesOf = grid => grid.map(row => row.map(g => g.t))

// 종류 배열 t에서 (r,c)를 포함한 3개 이상 줄 또는 2×2 사각형이 있는가
export function lineAt(t, r, c) {
  const x = t[r][c]
  let h = 1
  let v = 1
  for (let k = c - 1; k >= 0 && t[r][k] === x; k--) h++
  for (let k = c + 1; k < N && t[r][k] === x; k++) h++
  for (let k = r - 1; k >= 0 && t[k][c] === x; k--) v++
  for (let k = r + 1; k < N && t[k][c] === x; k++) v++
  if (h >= 3 || v >= 3) return true
  for (const [dr, dc] of [[-1, -1], [-1, 0], [0, -1], [0, 0]]) {
    const r0 = r + dr
    const c0 = c + dc
    if (r0 < 0 || c0 < 0 || r0 + 1 >= N || c0 + 1 >= N) continue
    if (t[r0][c0] === x && t[r0][c0 + 1] === x && t[r0 + 1][c0] === x && t[r0 + 1][c0 + 1] === x) return true
  }
  return false
}

// 지금 사라질 칸들. { cells: [[r,c],...], square: 사각형이 있었는가 }
export function findMatches(t) {
  const keys = new Set()
  const add = (r, c) => keys.add(r * N + c)
  for (let r = 0; r < N; r++) {
    let run = 1
    for (let c = 1; c <= N; c++) {
      if (c < N && t[r][c] === t[r][c - 1]) run++
      else { if (run >= 3) for (let k = c - run; k < c; k++) add(r, k); run = 1 }
    }
  }
  for (let c = 0; c < N; c++) {
    let run = 1
    for (let r = 1; r <= N; r++) {
      if (r < N && t[r][c] === t[r - 1][c]) run++
      else { if (run >= 3) for (let k = r - run; k < r; k++) add(k, c); run = 1 }
    }
  }
  let square = false
  for (let r = 0; r < N - 1; r++) {
    for (let c = 0; c < N - 1; c++) {
      const x = t[r][c]
      if (t[r][c + 1] === x && t[r + 1][c] === x && t[r + 1][c + 1] === x) {
        add(r, c); add(r, c + 1); add(r + 1, c); add(r + 1, c + 1)
        square = true
      }
    }
  }
  const cells = [...keys].map(k => [Math.floor(k / N), k % N])
  return { cells, square }
}

// 바꾸면 사라질 묶음이 생기는 한 수. [[r,c],[r2,c2]] 또는 null
export function findMove(t0) {
  const t = t0.map(row => [...row])
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      for (const [dr, dc] of [[0, 1], [1, 0]]) {
        const r2 = r + dr
        const c2 = c + dc
        if (r2 >= N || c2 >= N || t[r][c] === t[r2][c2]) continue;
        [t[r][c], t[r2][c2]] = [t[r2][c2], t[r][c]]
        const ok = lineAt(t, r, c) || lineAt(t, r2, c2);
        [t[r][c], t[r2][c2]] = [t[r2][c2], t[r][c]]
        if (ok) return [[r, c], [r2, c2]]
      }
    }
  }
  return null
}

// 처음부터 사라질 묶음이 없고, 둘 수 있는 수가 있는 종류 배열
export function freshTypes(rand = Math.random) {
  for (;;) {
    const t = []
    for (let r = 0; r < N; r++) {
      t.push([])
      for (let c = 0; c < N; c++) {
        let x
        do { x = randType(rand) }
        while ((c >= 2 && t[r][c - 1] === x && t[r][c - 2] === x) ||
               (r >= 2 && t[r - 1][c] === x && t[r - 2][c] === x) ||
               (r >= 1 && c >= 1 && t[r - 1][c] === x && t[r][c - 1] === x && t[r - 1][c - 1] === x))
        t[r].push(x)
      }
    }
    if (findMove(t)) return t
  }
}

// 한 번에 사라진 보석 수와 콤보 단계로 얻는 점수
export function scoreFor(size, combo) {
  const bonus = size >= 5 ? 2 : size === 4 ? 1.5 : 1
  return Math.round(size * 10 * combo * bonus)
}

// 두 칸의 보석을 바꾼 새 판
export function swapGrid(grid, [ar, ac], [br, bc]) {
  const next = grid.map(row => [...row])
  const a = grid[ar][ac]
  const b = grid[br][bc]
  next[br][bc] = { ...a, r: br, c: bc, dur: undefined }
  next[ar][ac] = { ...b, r: ar, c: ac, dur: undefined }
  return next
}

// 빈칸(null) 위 보석을 떨어뜨리고 새 보석으로 채운 새 판.
// makeGem() → { id, t } 를 돌려주는 함수. 걸리는 시간(초)도 돌려준다.
export function collapse(holes, makeGem) {
  const next = Array.from({ length: N }, () => Array(N).fill(null))
  let maxDur = 0
  for (let c = 0; c < N; c++) {
    let write = N - 1
    for (let r = N - 1; r >= 0; r--) {
      const g = holes[r][c]
      if (!g) continue
      if (r !== write) {
        const dur = 0.1 + 0.06 * (write - r)
        maxDur = Math.max(maxDur, dur)
        next[write][c] = { ...g, r: write, c, dur }
      } else {
        next[write][c] = { ...g, dur: undefined }
      }
      write--
    }
    const missing = write + 1
    for (let r = write; r >= 0; r--) {
      const dur = 0.1 + 0.06 * missing
      maxDur = Math.max(maxDur, dur)
      next[r][c] = { ...makeGem(), r, c, fromRow: r - missing, dur }
    }
  }
  return { grid: next, maxDur }
}
