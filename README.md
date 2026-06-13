# Crystal Blocks 3D

Prototype game UI chạy trên Next.js cho ý tưởng "Crystal Blocks 3D".

## Có gì trong repo

- Next.js web UI với phong cách low-poly, màu sắc rực rỡ.
- Gameplay block puzzle 3D dạng prototype.
- 4 mode: Story, Endless, Time Attack, Multiplayer shell.
- Khối đặc biệt: Crystal, Bomb, Ice, Rainbow.
- Achievement, daily challenge, character selection, HUD.
- GitHub Actions để typecheck và build trên CI.

## Chạy trên CI

Repo này được thiết kế để build trên GitHub Actions. Workflow nằm ở:

- [`.github/workflows/ci.yml`](./.github/workflows/ci.yml)

## Ghi chú

- Bản multiplayer hiện là khung UI và gameplay single-player, sẵn chỗ để nối backend realtime sau.
- Nếu muốn, mình có thể nối tiếp để làm bản WebGL renderer hoặc thêm backend multiplayer bằng Socket.IO / WebRTC.
