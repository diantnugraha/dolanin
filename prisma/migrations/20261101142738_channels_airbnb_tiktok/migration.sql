-- Airbnb and TikTok booking links. BEFORE keeps WhatsApp last: the enum order is the display order.
ALTER TYPE "BookingChannel" ADD VALUE 'AIRBNB' BEFORE 'WHATSAPP';
ALTER TYPE "BookingChannel" ADD VALUE 'TIKTOK' BEFORE 'WHATSAPP';
