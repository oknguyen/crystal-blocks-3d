# Castle Runner

Next.js platformer kiểu Mario, chạy trên GitHub Pages.

## Trò chơi

- Chạy ngang, nhảy qua hố, đạp quái.
- Nhặt coin, lấy star power và thêm mạng.
- Có checkpoint, cột cờ cuối màn và chế độ victory/gameover.
- Tối ưu để deploy tĩnh lên GitHub Pages.

## Điều khiển

- `A/D` hoặc `Arrow Left/Right`: di chuyển
- `Space` / `W` / `Arrow Up`: nhảy
- `Shift`: chạy nhanh
- `P` hoặc `Esc`: pause
- `R`: restart

## Deploy

Workflow GitHub Actions nằm ở:

- [`.github/workflows/ci.yml`](./.github/workflows/ci.yml)

Repo được cấu hình để export tĩnh qua Next.js và deploy lên Pages.
