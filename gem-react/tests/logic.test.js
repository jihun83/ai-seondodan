// 게임 규칙 시험 — 실행: npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  N, freshTypes, findMatches, findMove, lineAt, scoreFor, swapGrid, collapse, typesOf,
} from '../src/logic.js'

// 줄도 사각형도 없는 바탕 무늬 (r*2 + c*3) % 7
const plain = () => Array.from({ length: N }, (_, r) => Array.from({ length: N }, (_, c) => (r * 2 + c * 3) % 7))
const toGrid = t => t.map((row, r) => row.map((x, c) => ({ id: r * N + c, t: x, r, c })))

test('바탕 무늬에는 사라질 묶음이 없다', () => {
  assert.equal(findMatches(plain()).cells.length, 0)
})

test('새 판 200개: 사라질 묶음 0개, 둘 수 있는 수 있음', () => {
  for (let i = 0; i < 200; i++) {
    const t = freshTypes()
    assert.equal(findMatches(t).cells.length, 0)
    assert.ok(findMove(t))
  }
})

test('가로 3개 줄을 찾는다', () => {
  const t = plain()
  t[2][1] = t[2][2] = t[2][3] = 9
  const m = findMatches(t)
  assert.equal(m.cells.length, 3)
  assert.equal(m.square, false)
})

test('세로 4개 줄을 찾는다', () => {
  const t = plain()
  for (let r = 3; r < 7; r++) t[r][5] = 9
  assert.equal(findMatches(t).cells.length, 4)
})

test('2×2 사각형을 찾고 square 표시를 한다', () => {
  const t = plain()
  t[4][4] = t[4][5] = t[5][4] = t[5][5] = 9
  const m = findMatches(t)
  assert.equal(m.cells.length, 4)
  assert.equal(m.square, true)
})

test('사각형만 만드는 수도 둘 수 있는 수로 찾는다', () => {
  assert.equal(findMove(plain()), null, '바탕 무늬에는 둘 수 있는 수가 없어야 시험이 성립')
  const t = plain()
  // (0,0)(0,1)(1,0)=9, (1,2)=9 → (1,1)<->(1,2) 바꾸면 사각형
  t[0][0] = t[0][1] = t[1][0] = t[1][2] = 9
  assert.equal(findMatches(t).cells.length, 0)
  assert.ok(findMove(t))
  const s = t.map(row => [...row]);
  [s[1][1], s[1][2]] = [s[1][2], s[1][1]]
  // 이 바꾸기는 줄 없이 사각형만 만든다 → lineAt이 사각형으로 알아봐야 한다
  assert.equal(lineAt(s, 1, 1), true)
  const m = findMatches(s)
  assert.equal(m.cells.length, 4)
  assert.equal(m.square, true)
})

test('사각형 판정을 빼면 같은 바꾸기가 줄로는 안 잡힌다(위 시험의 대조군)', () => {
  const t = plain()
  t[0][0] = t[0][1] = t[1][0] = t[1][2] = 9;
  [t[1][1], t[1][2]] = [t[1][2], t[1][1]]
  const lineOnly = findMatches(t).cells.filter(([r, c]) => !(r <= 1 && c <= 1))
  assert.equal(lineOnly.length, 0)
})

test('점수: PRD 예시와 같다', () => {
  assert.equal(scoreFor(3, 1), 30)
  assert.equal(scoreFor(4, 1), 60)
  assert.equal(scoreFor(3, 2), 60)
  assert.equal(scoreFor(5, 1), 100)
})

test('swapGrid: 두 보석 자리와 좌표가 바뀐다', () => {
  const g = toGrid(plain())
  const a = g[3][3]
  const b = g[3][4]
  const n = swapGrid(g, [3, 3], [3, 4])
  assert.equal(n[3][4].id, a.id)
  assert.equal(n[3][3].id, b.id)
  assert.deepEqual([n[3][4].r, n[3][4].c], [3, 4])
  assert.equal(g[3][3].id, a.id, '원래 판은 그대로')
})

test('collapse: 빈칸이 채워지고 열 안의 순서가 유지된다', () => {
  const g = toGrid(plain())
  const holes = g.map(row => [...row])
  const colBefore = [0, 1, 2, 3].map(r => holes[r][2].id)
  holes[4][2] = holes[5][2] = holes[6][2] = null
  let next = 1000
  const { grid, maxDur } = collapse(holes, () => ({ id: next++, t: 0 }))
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      assert.ok(grid[r][c], `빈칸 없음 ${r},${c}`)
      assert.deepEqual([grid[r][c].r, grid[r][c].c], [r, c])
    }
  }
  // 위에 있던 보석 4개가 3칸씩 내려와 순서 유지
  assert.deepEqual([3, 4, 5, 6].map(r => grid[r][2].id), colBefore)
  // 새 보석 3개는 판 위에서 출발
  assert.deepEqual([0, 1, 2].map(r => grid[r][2].fromRow), [-3, -2, -1])
  assert.ok(maxDur > 0)
  assert.equal(new Set(grid.flat().map(x => x.id)).size, N * N, 'id 중복 없음')
  assert.equal(typesOf(grid).length, N)
})
