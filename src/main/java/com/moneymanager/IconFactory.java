package com.moneymanager;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.geom.RoundRectangle2D;
import java.awt.image.BufferedImage;
import java.io.*;
import java.util.ArrayList;
import java.util.List;

/**
 * Genera l'icona dell'applicazione a runtime (JFrame) e come file .ico (jpackage).
 * Eseguire con: java -cp ... com.moneymanager.IconFactory <percorso.ico>
 */
public class IconFactory {

    /** Disegna l'icona a una data dimensione. */
    public static BufferedImage create(int size) {
        BufferedImage img = new BufferedImage(size, size, BufferedImage.TYPE_INT_ARGB);
        Graphics2D g = img.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING,      RenderingHints.VALUE_ANTIALIAS_ON);
        g.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON);
        g.setRenderingHint(RenderingHints.KEY_RENDERING,         RenderingHints.VALUE_RENDER_QUALITY);

        // Sfondo trasparente
        g.setColor(new Color(0, 0, 0, 0));
        g.fillRect(0, 0, size, size);

        // Sfondo arrotondato (gradiente verde)
        float pad = size * 0.04f;
        float arc = size * 0.22f;
        RoundRectangle2D.Float bg = new RoundRectangle2D.Float(pad, pad, size - 2*pad, size - 2*pad, arc, arc);
        g.setPaint(new GradientPaint(0, 0, new Color(0x1a8a4a), 0, size, new Color(0x0a5c30)));
        g.fill(bg);

        // Bordo sottile più chiaro
        g.setColor(new Color(0x3fb950));
        g.setStroke(new BasicStroke(size * 0.03f));
        g.draw(bg);

        // Simbolo €
        g.setColor(Color.WHITE);
        float fontSize = size * 0.58f;
        g.setFont(new Font("Segoe UI", Font.BOLD, Math.round(fontSize)));
        FontMetrics fm = g.getFontMetrics();
        String text = "\u20AC";
        int tx = Math.round((size - fm.stringWidth(text)) / 2f);
        int ty = Math.round((size + fm.getAscent() - fm.getDescent()) / 2f - fm.getDescent() / 2f);

        // Ombra leggera
        g.setColor(new Color(0, 0, 0, 50));
        g.drawString(text, tx + Math.max(1, size / 32), ty + Math.max(1, size / 32));
        // Testo
        g.setColor(Color.WHITE);
        g.drawString(text, tx, ty);

        g.dispose();
        return img;
    }

    /** Lista di immagini a più dimensioni per JFrame.setIconImages(). */
    public static List<Image> getAppIcons() {
        List<Image> icons = new ArrayList<>();
        for (int s : new int[]{16, 32, 48, 64, 128, 256}) {
            icons.add(create(s));
        }
        return icons;
    }

    /**
     * Scrive un file .ico in formato PNG-ICO (Windows Vista+).
     * Le dimensioni standard sono 16, 32, 48, 256.
     */
    public static void writeIco(File file, int[] sizes) throws IOException {
        List<byte[]> blobs = new ArrayList<>();
        for (int s : sizes) {
            ByteArrayOutputStream bos = new ByteArrayOutputStream();
            ImageIO.write(create(s), "PNG", bos);
            blobs.add(bos.toByteArray());
        }

        try (FileOutputStream fos = new FileOutputStream(file)) {
            // ICONDIR (6 byte, little-endian)
            fos.write(le16(0));              // reserved
            fos.write(le16(1));              // type = icon
            fos.write(le16(sizes.length));   // count

            // Offset primo PNG = header + N * 16 byte entry
            int offset = 6 + sizes.length * 16;

            // ICONDIRENTRY (16 byte per immagine)
            for (int i = 0; i < sizes.length; i++) {
                int s   = sizes[i];
                int len = blobs.get(i).length;
                fos.write(s >= 256 ? 0 : s); // width  (0 = 256)
                fos.write(s >= 256 ? 0 : s); // height (0 = 256)
                fos.write(0);                 // colorCount
                fos.write(0);                 // reserved
                fos.write(le16(1));           // planes
                fos.write(le16(32));          // bitCount
                fos.write(le32(len));         // sizeInBytes
                fos.write(le32(offset));      // fileOffset
                offset += len;
            }

            // Dati PNG
            for (byte[] blob : blobs) fos.write(blob);
        }
    }

    private static byte[] le16(int v) {
        return new byte[]{(byte)(v & 0xFF), (byte)((v >> 8) & 0xFF)};
    }

    private static byte[] le32(int v) {
        return new byte[]{(byte)(v & 0xFF), (byte)((v>>8) & 0xFF), (byte)((v>>16) & 0xFF), (byte)((v>>24) & 0xFF)};
    }

    /** Genera icon.ico nel percorso specificato (usato da Maven prepare-package). */
    public static void main(String[] args) throws IOException {
        String path = args.length > 0 ? args[0] : "icon.ico";
        File out = new File(path);
        out.getParentFile().mkdirs();
        writeIco(out, new int[]{16, 32, 48, 256});
        System.out.println("[IconFactory] Scritto: " + out.getAbsolutePath());
    }
}
