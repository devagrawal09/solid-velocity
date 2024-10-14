import { createAsync } from '@solidjs/router';
import QrCodeGenerator from 'qrcode';
import { getProfileAndConnections } from '.';

export default function QrCode() {
  const qrCodeDataUrl = createAsync(async () => {
    const existingQrCodeDataUrl = window.localStorage.getItem(`qr-code-data-url`);
    if (existingQrCodeDataUrl) {
      console.log(`found cached qr`);
      return existingQrCodeDataUrl;
    }
    const profileId = (await getProfileAndConnections()).profile.id;
    const newQrCodeDataUrl = await QrCodeGenerator.toDataURL(
      `https://app.momentumdevcon.com/attendee/${profileId}`
    );
    console.log(newQrCodeDataUrl);
    window.localStorage.setItem(`qr-code-data-url`, newQrCodeDataUrl);
    return newQrCodeDataUrl;
  });
  return (
    <div class="w-[300px] bg-gray-200 h-[300px] rounded text-black text-[70px] justify-center flex items-center">
      <img src={qrCodeDataUrl()} class="w-full h-full" />
    </div>
  );
}
