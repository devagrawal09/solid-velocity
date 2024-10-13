import { createAsync } from '@solidjs/router';
import QrCodeGenerator from 'qrcode';

export default function QrCode({ profileId }: { profileId: string }) {
  // First check if there is already a QR code stored in localStorage
  // If no Qr code yet means no profile created yet
  const qrCodeDataUrl = createAsync(async () => {
    const existingQrCodeDataUrl = window.localStorage.getItem(`qr-code-data-url-${profileId}`);
    if (existingQrCodeDataUrl) {
      return existingQrCodeDataUrl;
    }
    const newQrCodeDataUrl = await QrCodeGenerator.toDataURL(
      `https://app.momentumdevcon.com/attendee/${profileId}`
    );
    console.log(newQrCodeDataUrl);
    window.localStorage.setItem(`qr-code-data-url-${profileId}`, newQrCodeDataUrl);
    return newQrCodeDataUrl;
  });
  return (
    <div class="w-[300px] bg-gray-200 h-[300px] rounded text-black text-[70px] justify-center flex items-center">
      <img src={qrCodeDataUrl()} class="w-full h-full" />
    </div>
  );
}
