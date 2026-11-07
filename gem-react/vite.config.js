import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 빌드 결과물을 저장소 맨 위의 '보석게임-react' 폴더에 만든다.
// GitHub Pages가 main 갈래의 그 폴더를 그대로 보여 준다.
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: '../보석게임-react',
    emptyOutDir: true,
  },
})
