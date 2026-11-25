# Hydro — yemek sitesi (pizza, hamburger, dürüm)

Canlı: https://hydro567.github.io/hydro-pizza/ — GitHub Pages. `main` ve `gh-pages` dalları aynı commit'i gösterir;
değişikliği ikisine de gönder: `git push origin main` ve `git push origin main:gh-pages`.
Kullanıcıyla Türkçe konuş.

## Yapı
- `index.html` — tüm sayfa; pizza kutusu kapağı `#lid` içindeki SVG. 3D kutu (`js3d/bundle.js`) kapak dokusunu bu SVG'den üretir,
  yani kapak çizimini sadece `index.html`'de değiştirmek yeterli.
- `js/` — pizza, burger, döner ve ödeme akışları. `css/` — stiller. `js3d/bundle.js` — derlenmiş Three.js sahnesi (kaynağı burada yok).

## Kullanıcının kararları
- Sitede mızrak/trident olmayacak. Kapaktaki domates maskot mızrak tutmaz, el sallar.
