# Kindle Sudoku

Klasik 9×9 Sudoku. Her satır, her sütun ve her 3×3 kutu 1–9 rakamlarını birer kez içerir. Baştan verilen rakamlar değişmez. Her bulmacanın tek çözümü vardır; hedef seviyesinin üstünde bir teknik gerekmez.

Zorluk, boş kare sayısından değil, çözmek için gereken en zor mantık adımından gelir:

| Seviye | Teknik |
| --- | --- |
| Başlangıç | Gizli ve çıplak tekler |
| Kolay | Kutu-satır elemesi |
| Orta | Çıplak ve gizli çiftler |
| Zor | Üçlüler ve X-Wing |
| Uzman | Swordfish ve XY-Wing |
| ZeyLevel | XYZ-Wing |

Oyun Kindle’ın web tarayıcısında çalışır. EPUB, AZW3 ve KFX JavaScript çalıştırmaz; dosyayı kitap gibi açmayın. Jailbreak gerekmez.

Türkçe ve İngilizce arayüz vardır. Yeni oyundan önce oyuncu adı istenir. İlerleme, istatistik ve yarıda kalan oyun tarayıcının yerel belleğinde durur. Ağ çağrısı, animasyon ve saniye saniye yenilenen sayaç yoktur; süre yalnızca bir hamle, silme veya menüde güncellenir. Oyun açıldıktan sonra uçak modu pile en az yükü bindirir.

## Kurulum

Bilgisayarda yalnızca `index.html` dosyası gerekir. `tools` klasörü bulmaca üretmek içindir, Kindle’a kopyalanmaz.

Kindle’da tarayıcı ayarından JavaScript açık olsun. Bazı cihazlarda haber siteleri için kapatılmış olabilir; bu oyun onsuz başlamaz.

### Yazılım 5.16.3 ve öncesi

Bu sürümlerde deneysel tarayıcı, USB bellekteki dosyayı internet olmadan açar.

1. Kindle’ı USB ile bilgisayara bağlayın.
2. `index.html` dosyasını Kindle sürücüsünün köküne kopyalayın.
3. Güvenle çıkarın.
4. Deneysel tarayıcıyı açın ve adres çubuğuna şunu yazın: `file:///mnt/us/index.html`
5. Sayfayı yer imlerine ekleyin.
6. Uçak modunu açın. Bundan sonra internet gerekmez.

### Yazılım 5.16.4 ve sonrası

Güncel Paperwhite, Basic, Scribe ve Colorsoft tarayıcıları `file://` adresini engeller. Sayfayı bir kez internetle açın; hizmet çalışanı oyunu kaydeder. Sonra yer imi ve uçak modu yeter.

1. Kindle tarayıcısında şu adresi açın: `https://obilginozi.github.io/kindle-sudoku/`
2. Dil seçimi gelene kadar bekleyin, sayfayı yer imlerine ekleyin.
3. Uçak modunu açın. Yer iminden tekrar açınca oyun internet olmadan gelir.

Bilgisayarınızla aynı Wi-Fi üzerinden de açabilirsiniz. Bu, GitHub’a bağlanmadan denemek içindir.

1. Bilgisayar ve Kindle aynı Wi-Fi ağında olsun.
2. Bu klasörde küçük bir sunucu başlatın:

   ```bash
   python3 -m http.server 8080
   ```

3. Bilgisayarın yerel adresini öğrenin. macOS’ta genellikle:

   ```bash
   ipconfig getifaddr en0
   ```

4. Kindle tarayıcısında `http://BILGISAYAR_ADRESI:8080/` açın. Örneğin `http://192.168.1.20:8080/`.
5. Sayfa gelince yer imlerine ekleyin, sunucuyu kapatın ve uçak modunu açın.

Yer imi durduğu sürece tarayıcı, başka site açılmazsa oyunu ön bellekten getirir.

## Oynanış

1. Dili seçin. Seçim kalır; ana sayfadaki Dil düğmesinden değişir.
2. Yeni oyunda bir ad yazın veya kayıtlı adı seçin. Boş ad kabul edilmez.
3. Seviyeyi seçin. Seviyeler kilitli değildir; her birinin istediği teknik yazılır.
4. Bir kareye dokunup rakam pedinden sayı girin. Not modu, boş kareye kurşun kalem adayı yazar.
5. Çakışma açıksa, son girilen rakam satır, sütun veya kutuda tekrar ediyorsa o kare ters renkte görünür. Bu uyarı ana sayfadan kapatılabilir.
6. İpucu, bir sonraki mantık adımını seçilen dilde anlatır ve bir kareyi açar.
7. Menü, süreyi kaydedip ana sayfaya döner. Tarayıcı kapanınca yarım oyun durur.
8. Aynı oyuncuya aynı bulmaca, o seviyedeki deste bitene kadar yeniden gelmez.

Hayalet görüntü kalırsa Ekranı tazele düğmesi ekranı bir kez beyaza çevirip geri getirir.

## Bulmacaları yeniden üretmek

Bilgisayarda Node.js ile, Kindle’da değil:

```bash
node tools/generate-puzzles.js
```

Komut her seviyeye 40 tek çözümlü bulmaca koyar ve `index.html` dosyasını baştan yazar.
