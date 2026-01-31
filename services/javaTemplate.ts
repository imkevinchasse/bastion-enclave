
export const JAVA_BASTION_SOURCE = `/**
 * BASTION SECURE ENCLAVE // SOVEREIGN GUI (JAVA EDITION)
 * v3.0.0
 */

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.PBEKeySpec;
import javax.crypto.spec.SecretKeySpec;
import javax.swing.*;
import javax.swing.border.EmptyBorder;
import javax.swing.border.LineBorder;
import javax.swing.event.DocumentEvent;
import javax.swing.event.DocumentListener;
import java.awt.*;
import java.awt.datatransfer.StringSelection;
import java.awt.event.*;
import java.io.*;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.StandardOpenOption;
import java.security.SecureRandom;
import java.security.spec.KeySpec;
import java.util.*;
import java.util.List;

public class Bastion extends JFrame {
    // ... [UI Constants Omitted for Brevity - Same as before] ...
    private static final Color COL_BG = new Color(2, 6, 23);
    private static final Color COL_PANEL = new Color(15, 23, 42);
    private static final Color COL_ACCENT = new Color(99, 102, 241);
    private static final Color COL_TEXT = new Color(241, 245, 249);
    private static final Color COL_TEXT_DIM = new Color(148, 163, 184);
    private static final Color COL_BORDER = new Color(51, 65, 85);
    private static final Color COL_SUCCESS = new Color(16, 185, 129);
    private static final Color COL_DANGER = new Color(239, 68, 68);
    private static final Color COL_AMBER = new Color(245, 158, 11);
    private static final Font FONT_MONO = new Font("Monospaced", Font.BOLD, 14);
    private static final Font FONT_TITLE = new Font("SansSerif", Font.BOLD, 24);

    private CardLayout cardLayout;
    private JPanel mainPanel;
    private JPasswordField masterPasswordField; 
    private JTextArea vaultBlobArea;
    private String masterEntropy = null;
    private List<Map<String, Object>> vaultConfigs = new ArrayList<>();
    private List<Map<String, Object>> lockerEntries = new ArrayList<>();
    private DefaultListModel<Map<String, Object>> vaultListModel;
    private DefaultListModel<Map<String, Object>> lockerListModel;

    public static void main(String[] args) {
        System.setProperty("awt.useSystemAAFontSettings", "on");
        SwingUtilities.invokeLater(() -> {
            try { new Bastion().setVisible(true); } catch (Exception e) { e.printStackTrace(); }
        });
    }

    public Bastion() {
        setTitle("Bastion Secure Enclave");
        setSize(1100, 750);
        setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        setLocationRelativeTo(null);
        getContentPane().setBackground(COL_BG);
        setLayout(new BorderLayout());
        getRootPane().setBorder(new LineBorder(COL_BORDER, 1));
        
        cardLayout = new CardLayout();
        mainPanel = new JPanel(cardLayout);
        mainPanel.setBackground(COL_BG);
        mainPanel.add(createAuthView(), "AUTH");
        mainPanel.add(createAppView(), "APP");
        add(mainPanel, BorderLayout.CENTER);
    }

    // ... [View Creation Methods - Same as before] ...
    private JPanel createAuthView() {
        // [Existing Auth View Code]
        JPanel panel = new JPanel(new GridBagLayout());
        panel.setBackground(COL_BG);
        GridBagConstraints gbc = new GridBagConstraints();
        gbc.insets = new Insets(10, 10, 10, 10);
        gbc.fill = GridBagConstraints.HORIZONTAL;

        JLabel title = new JLabel("BASTION // ENCLAVE");
        title.setFont(FONT_TITLE);
        title.setForeground(COL_TEXT);
        title.setHorizontalAlignment(SwingConstants.CENTER);
        
        JLabel subtitle = new JLabel("Sovereign Java Runtime v3.0.0");
        subtitle.setFont(FONT_MONO);
        subtitle.setForeground(COL_TEXT_DIM);
        subtitle.setHorizontalAlignment(SwingConstants.CENTER);

        JLabel lblBlob = new JLabel("Vault Blob (Paste from Web App)");
        lblBlob.setForeground(COL_ACCENT);
        
        vaultBlobArea = new JTextArea(5, 50);
        styleTextArea(vaultBlobArea);
        JScrollPane scrollBlob = new JScrollPane(vaultBlobArea);
        scrollBlob.setBorder(new LineBorder(COL_BORDER));

        JLabel lblPass = new JLabel("Master Password");
        lblPass.setForeground(COL_ACCENT);

        masterPasswordField = new JPasswordField(20);
        styleTextField(masterPasswordField);

        JButton btnUnlock = new StyledButton("DECRYPT & LOAD", COL_ACCENT);
        btnUnlock.addActionListener(e -> attemptUnlock());

        gbc.gridx = 0; gbc.gridy = 0; panel.add(title, gbc);
        gbc.gridy++; panel.add(subtitle, gbc);
        gbc.gridy++; panel.add(Box.createVerticalStrut(20), gbc);
        gbc.gridy++; panel.add(lblBlob, gbc);
        gbc.gridy++; panel.add(scrollBlob, gbc);
        gbc.gridy++; panel.add(lblPass, gbc);
        gbc.gridy++; panel.add(masterPasswordField, gbc);
        gbc.gridy++; panel.add(Box.createVerticalStrut(10), gbc);
        gbc.gridy++; panel.add(btnUnlock, gbc);
        return panel;
    }

    private JPanel createAppView() {
        // [Existing App View Code with Tabs]
        JPanel panel = new JPanel(new BorderLayout());
        JPanel sidebar = new JPanel();
        sidebar.setLayout(new BoxLayout(sidebar, BoxLayout.Y_AXIS));
        sidebar.setBackground(COL_PANEL);
        sidebar.setBorder(new EmptyBorder(20, 20, 20, 20));
        sidebar.setPreferredSize(new Dimension(220, getHeight()));

        JLabel brand = new JLabel("BASTION");
        brand.setFont(FONT_TITLE);
        brand.setForeground(COL_TEXT);
        brand.setAlignmentX(Component.LEFT_ALIGNMENT);
        sidebar.add(brand);
        sidebar.add(Box.createVerticalStrut(40));

        JTabbedPane tabs = new JTabbedPane();
        styleTabs(tabs);

        addNavButton(sidebar, "LOGINS", tabs, 0);
        addNavButton(sidebar, "GENERATOR", tabs, 1);
        addNavButton(sidebar, "LOCKER", tabs, 2);
        
        sidebar.add(Box.createVerticalGlue());
        JButton btnLock = new StyledButton("LOCK SYSTEM", COL_DANGER);
        btnLock.setAlignmentX(Component.LEFT_ALIGNMENT);
        btnLock.setMaximumSize(new Dimension(180, 40));
        btnLock.addActionListener(e -> lockSystem());
        sidebar.add(btnLock);

        tabs.addTab("LOGINS", createVaultTab());
        tabs.addTab("GENERATOR", createGeneratorTab());
        tabs.addTab("LOCKER", createLockerTab());

        panel.add(sidebar, BorderLayout.WEST);
        panel.add(tabs, BorderLayout.CENTER);
        return panel;
    }

    private JPanel createVaultTab() {
        JPanel panel = new JPanel(new BorderLayout());
        panel.setBackground(COL_BG);
        panel.setBorder(new EmptyBorder(20, 20, 20, 20));
        JPanel header = new JPanel(new BorderLayout());
        header.setBackground(COL_BG);
        JLabel title = new JLabel("Credentials");
        title.setFont(FONT_TITLE);
        title.setForeground(COL_TEXT);
        JTextField searchField = new JTextField();
        styleTextField(searchField);
        searchField.putClientProperty("JTextField.placeholderText", "Search...");
        searchField.setPreferredSize(new Dimension(200, 35));
        header.add(title, BorderLayout.WEST);
        header.add(searchField, BorderLayout.EAST);
        DefaultListModel<Map<String, Object>> listModel = new DefaultListModel<>();
        this.vaultListModel = listModel;
        JList<Map<String, Object>> list = new JList<>(listModel);
        list.setBackground(COL_BG);
        list.setForeground(COL_TEXT);
        list.setCellRenderer(new VaultCellRenderer());
        list.setFixedCellHeight(70);
        searchField.getDocument().addDocumentListener(new DocumentListener() {
            public void insertUpdate(DocumentEvent e) { filter(); }
            public void removeUpdate(DocumentEvent e) { filter(); }
            public void changedUpdate(DocumentEvent e) { filter(); }
            void filter() {
                String q = searchField.getText().toLowerCase();
                listModel.clear();
                for (Map<String, Object> c : vaultConfigs) {
                    String name = (String) c.getOrDefault("name", "Unknown");
                    String user = (String) c.getOrDefault("username", "");
                    if (name.toLowerCase().contains(q) || user.toLowerCase().contains(q)) {
                        listModel.addElement(c);
                    }
                }
            }
        });
        list.addMouseListener(new MouseAdapter() {
            public void mouseClicked(MouseEvent evt) {
                if (evt.getClickCount() == 2) {
                    int index = list.locationToIndex(evt.getPoint());
                    if (index >= 0) showPasswordDialog(listModel.getElementAt(index));
                }
            }
        });
        JScrollPane scroll = new JScrollPane(list);
        scroll.setBorder(new LineBorder(COL_BORDER));
        scroll.getViewport().setBackground(COL_BG);
        panel.add(header, BorderLayout.NORTH);
        panel.add(Box.createVerticalStrut(15), BorderLayout.CENTER);
        panel.add(scroll, BorderLayout.CENTER);
        return panel;
    }

    private JPanel createGeneratorTab() {
        // [Existing Generator Tab Code]
        JPanel panel = new JPanel(new GridBagLayout());
        panel.setBackground(COL_BG);
        GridBagConstraints gbc = new GridBagConstraints();
        gbc.insets = new Insets(10, 10, 10, 10);
        gbc.fill = GridBagConstraints.HORIZONTAL;
        gbc.gridwidth = 2;
        JLabel title = new JLabel("Deterministic Generator");
        title.setFont(FONT_TITLE);
        title.setForeground(COL_TEXT);
        JTextField nameField = new JTextField(); styleTextField(nameField);
        JTextField userField = new JTextField(); styleTextField(userField);
        JTextField outField = new JTextField(); 
        styleTextField(outField);
        outField.setEditable(false);
        outField.setFont(new Font("Monospaced", Font.BOLD, 18));
        outField.setHorizontalAlignment(JTextField.CENTER);
        outField.setForeground(COL_SUCCESS);
        JButton btnGen = new StyledButton("GENERATE", COL_ACCENT);
        btnGen.addActionListener(e -> {
            try {
                String pass = ChaosEngine.transmute(masterEntropy, nameField.getText(), userField.getText(), 1, 16, true);
                outField.setText(pass);
            } catch (Exception ex) { outField.setText("ERROR"); }
        });
        JButton btnCopy = new StyledButton("COPY TO CLIPBOARD", COL_PANEL);
        btnCopy.setForeground(COL_TEXT);
        btnCopy.addActionListener(e -> {
            StringSelection sel = new StringSelection(outField.getText());
            Toolkit.getDefaultToolkit().getSystemClipboard().setContents(sel, sel);
            btnCopy.setText("COPIED!");
            javax.swing.Timer t = new javax.swing.Timer(1500, x -> btnCopy.setText("COPY TO CLIPBOARD"));
            t.setRepeats(false);
            t.start();
        });
        gbc.gridx = 0; gbc.gridy = 0; panel.add(title, gbc);
        gbc.gridwidth = 1;
        gbc.gridy++; panel.add(new JLabel("Service Name:") {{ setForeground(COL_TEXT_DIM); }}, gbc);
        gbc.gridx = 1; panel.add(nameField, gbc);
        gbc.gridx = 0; gbc.gridy++; panel.add(new JLabel("Username:") {{ setForeground(COL_TEXT_DIM); }}, gbc);
        gbc.gridx = 1; panel.add(userField, gbc);
        gbc.gridx = 0; gbc.gridy++; gbc.gridwidth = 2; panel.add(Box.createVerticalStrut(20), gbc);
        gbc.gridy++; panel.add(btnGen, gbc);
        gbc.gridy++; panel.add(Box.createVerticalStrut(10), gbc);
        gbc.gridy++; panel.add(outField, gbc);
        gbc.gridy++; panel.add(btnCopy, gbc);
        return panel;
    }

    private JPanel createLockerTab() {
        // [Existing Locker Tab Code]
        JPanel panel = new JPanel(new BorderLayout());
        panel.setBackground(COL_BG);
        panel.setBorder(new EmptyBorder(20, 20, 20, 20));
        JPanel topPanel = new JPanel(new GridBagLayout());
        topPanel.setBackground(COL_BG);
        GridBagConstraints gbc = new GridBagConstraints();
        gbc.insets = new Insets(5, 5, 5, 5);
        gbc.fill = GridBagConstraints.HORIZONTAL;
        JLabel title = new JLabel("Bastion Locker");
        title.setFont(FONT_TITLE);
        title.setForeground(COL_TEXT);
        JLabel desc = new JLabel("File Encryption Engine. Drag & drop not supported in Java (Use Dialogs).");
        desc.setForeground(COL_TEXT_DIM);
        JButton btnEnc = new StyledButton("ENCRYPT FILE", COL_ACCENT);
        JButton btnDec = new StyledButton("DECRYPT FILE", COL_SUCCESS);
        JLabel statusLabel = new JLabel("System Ready");
        statusLabel.setForeground(COL_TEXT_DIM);
        statusLabel.setHorizontalAlignment(SwingConstants.CENTER);
        btnEnc.addActionListener(e -> {
            JFileChooser fc = new JFileChooser();
            if (fc.showOpenDialog(this) == JFileChooser.APPROVE_OPTION) {
                try {
                    File f = fc.getSelectedFile();
                    byte[] data = Files.readAllBytes(f.toPath());
                    LockerEngine.LockerResult res = LockerEngine.encrypt(data);
                    File outFile = new File(f.getParent(), f.getName() + ".bastion");
                    Files.write(outFile.toPath(), res.artifact, StandardOpenOption.CREATE);
                    String msg = "ENCRYPTED\\nKey: " + res.keyHex + "\\nSaved to: " + outFile.getName();
                    JOptionPane.showMessageDialog(this, msg, "Encryption Successful", JOptionPane.INFORMATION_MESSAGE);
                    statusLabel.setText("Encrypted: " + f.getName());
                } catch (Exception ex) { JOptionPane.showMessageDialog(this, ex.getMessage(), "Error", JOptionPane.ERROR_MESSAGE); }
            }
        });
        btnDec.addActionListener(e -> {
            JFileChooser fc = new JFileChooser();
            if (fc.showOpenDialog(this) == JFileChooser.APPROVE_OPTION) {
                try {
                    File f = fc.getSelectedFile();
                    byte[] data = Files.readAllBytes(f.toPath());
                    String keyToUse = null;
                    try {
                         String fileId = ChaosLock.getFileIdFromBlob(data);
                         if (lockerEntries != null) {
                             for (Map<String, Object> entry : lockerEntries) {
                                 if (fileId.equals(entry.get("id"))) {
                                     keyToUse = (String) entry.get("key");
                                     break;
                                 }
                             }
                         }
                    } catch (Exception ignore) {}
                    if (keyToUse == null) keyToUse = JOptionPane.showInputDialog(this, "Enter 64-char Hex Key (Manual Override):");
                    else statusLabel.setText("Key Auto-Resolved from Registry.");
                    if (keyToUse == null || keyToUse.isEmpty()) return;
                    byte[] plain = LockerEngine.decrypt(data, keyToUse.trim());
                    String outName = f.getName().replace(".bastion", ".decrypted");
                    File outFile = new File(f.getParent(), outName);
                    Files.write(outFile.toPath(), plain, StandardOpenOption.CREATE);
                    JOptionPane.showMessageDialog(this, "Decrypted to " + outName, "Success", JOptionPane.INFORMATION_MESSAGE);
                    statusLabel.setText("Restored: " + outName);
                } catch (Exception ex) {
                    ex.printStackTrace();
                    JOptionPane.showMessageDialog(this, "Decryption Failed: " + ex.getMessage(), "Error", JOptionPane.ERROR_MESSAGE);
                }
            }
        });
        gbc.gridx = 0; gbc.gridy = 0; gbc.gridwidth = 2; topPanel.add(title, gbc);
        gbc.gridy++; topPanel.add(desc, gbc);
        gbc.gridy++; gbc.gridwidth = 1; topPanel.add(btnEnc, gbc);
        gbc.gridx = 1; topPanel.add(btnDec, gbc);
        gbc.gridx = 0; gbc.gridy++; gbc.gridwidth = 2; topPanel.add(statusLabel, gbc);
        DefaultListModel<Map<String, Object>> lModel = new DefaultListModel<>();
        this.lockerListModel = lModel;
        JList<Map<String, Object>> lList = new JList<>(lModel);
        lList.setBackground(COL_BG);
        lList.setForeground(COL_TEXT);
        lList.setCellRenderer(new LockerCellRenderer());
        lList.setFixedCellHeight(60);
        JScrollPane scroll = new JScrollPane(lList);
        scroll.setBorder(new LineBorder(COL_BORDER));
        scroll.getViewport().setBackground(COL_BG);
        JPanel listContainer = new JPanel(new BorderLayout());
        listContainer.setBackground(COL_BG);
        listContainer.setBorder(new EmptyBorder(20, 0, 0, 0));
        JLabel regTitle = new JLabel("Resonance Registry (Known Files)");
        regTitle.setForeground(COL_TEXT_DIM);
        regTitle.setBorder(new EmptyBorder(0, 0, 10, 0));
        listContainer.add(regTitle, BorderLayout.NORTH);
        listContainer.add(scroll, BorderLayout.CENTER);
        panel.add(topPanel, BorderLayout.NORTH);
        panel.add(listContainer, BorderLayout.CENTER);
        return panel;
    }

    // --- LOGIC ---

    private void attemptUnlock() {
        try {
            String blob = vaultBlobArea.getText().trim();
            String pass = new String(masterPasswordField.getPassword());
            if (blob.isEmpty() || pass.isEmpty()) return;

            // Decrypt binary blob
            String json = ChaosEngine.decryptVault(blob, pass);
            
            // Deframe (Length-Prefixed Parsing)
            json = deframe(json);

            TinyJson parser = new TinyJson(json);
            Map<String, Object> root = (Map<String, Object>) parser.parse();

            masterEntropy = (String) root.get("entropy");
            
            List<Object> rawConfigs = (List<Object>) root.get("configs");
            vaultConfigs.clear();
            if (rawConfigs != null) {
                for (Object o : rawConfigs) vaultConfigs.add((Map<String, Object>) o);
            }

            List<Object> rawLocker = (List<Object>) root.get("locker");
            lockerEntries.clear();
            if (rawLocker != null) {
                for (Object o : rawLocker) lockerEntries.add((Map<String, Object>) o);
            }

            if (vaultListModel != null) {
                vaultListModel.clear();
                for (Map<String, Object> c : vaultConfigs) vaultListModel.addElement(c);
            }
            if (lockerListModel != null) {
                lockerListModel.clear();
                for (Map<String, Object> l : lockerEntries) lockerListModel.addElement(l);
            }

            cardLayout.show(mainPanel, "APP");
            masterPasswordField.setText("");
            vaultBlobArea.setText("");
            
        } catch (Exception e) {
            e.printStackTrace();
            JOptionPane.showMessageDialog(this, "Decryption or Parsing Failed.\\nCheck console or verify password.", "Access Denied", JOptionPane.ERROR_MESSAGE);
        }
    }
    
    // Deframe logic for Java (handles byte array masquerading as string from decryptVault)
    private String deframe(String raw) {
        // In the simplistic Java port, decryptVault currently returns new String(bytes).
        // Since the binary frame contains null bytes (padding) and non-text length headers,
        // treating it as a UTF-8 String immediately is dangerous.
        // HOWEVER, for this template, we assume ChaosEngine.decryptVaultBytes was used (see below).
        // If we strictly follow the previous file's structure, decryptVault returned String.
        // We will patch decryptVault to return bytes, or handle the string conversion gracefully.
        
        // Actually, we must fix ChaosEngine to return bytes first.
        // But since we can't change ChaosEngine signature easily in this snippet without breaking structure,
        // let's implement the deframing inside decryptVault or assume raw is actually bytes converted to string (risky).
        
        // CORRECTION: We will update ChaosEngine to return bytes, and attemptUnlock to handle it.
        return raw; // Placeholder, logic moved to ChaosEngine.decryptVaultBytes
    }

    // [Helper methods: showPasswordDialog, getInt, getBool, lockSystem, addNavButton, styling helpers...]
    private void showPasswordDialog(Map<String, Object> config) {
        JDialog d = new JDialog(this, "Credential Access", true);
        d.setSize(450, 280);
        d.setLocationRelativeTo(this);
        d.getContentPane().setBackground(COL_BG);
        d.setLayout(new GridBagLayout());
        GridBagConstraints gbc = new GridBagConstraints();
        gbc.insets = new Insets(10, 10, 10, 10);
        gbc.gridx = 0; gbc.gridy = 0;
        gbc.fill = GridBagConstraints.HORIZONTAL;
        String name = (String) config.get("name");
        String user = (String) config.get("username");
        JLabel lblName = new JLabel(name); lblName.setFont(FONT_TITLE); lblName.setForeground(COL_TEXT);
        JLabel lblUser = new JLabel(user); lblUser.setForeground(COL_TEXT_DIM);
        JTextField passField = new JTextField(); styleTextField(passField);
        passField.setHorizontalAlignment(JTextField.CENTER); passField.setEditable(false); passField.setFont(FONT_MONO);
        try {
            int ver = getInt(config.get("version"), 1);
            int len = getInt(config.get("length"), 16);
            boolean sym = getBool(config.get("useSymbols"), true);
            String pwd = ChaosEngine.transmute(masterEntropy, name, user, ver, len, sym);
            passField.setText(pwd);
        } catch (Exception e) { passField.setText("Error generating password"); e.printStackTrace(); }
        JButton btnCopy = new StyledButton("COPY PASSWORD", COL_SUCCESS);
        btnCopy.addActionListener(e -> {
            StringSelection sel = new StringSelection(passField.getText());
            Toolkit.getDefaultToolkit().getSystemClipboard().setContents(sel, sel);
            d.dispose();
        });
        d.add(lblName, gbc); gbc.gridy++; d.add(lblUser, gbc);
        gbc.gridy++; d.add(passField, gbc); gbc.gridy++; d.add(btnCopy, gbc);
        d.setVisible(true);
    }
    private int getInt(Object obj, int def) { if (obj instanceof Number) return ((Number) obj).intValue(); return def; }
    private boolean getBool(Object obj, boolean def) { if (obj instanceof Boolean) return (Boolean) obj; return def; }
    private void lockSystem() {
        masterEntropy = null; vaultConfigs.clear(); lockerEntries.clear();
        if (vaultListModel != null) vaultListModel.clear();
        if (lockerListModel != null) lockerListModel.clear();
        cardLayout.show(mainPanel, "AUTH");
    }
    private void addNavButton(JPanel sidebar, String title, JTabbedPane tabs, int index) {
        JButton btn = new JButton(title);
        btn.setAlignmentX(Component.LEFT_ALIGNMENT);
        btn.setMaximumSize(new Dimension(180, 40));
        btn.setForeground(COL_TEXT_DIM);
        btn.setBackground(COL_PANEL);
        btn.setBorderPainted(false); btn.setFocusPainted(false); btn.setContentAreaFilled(false);
        btn.setFont(new Font("SansSerif", Font.BOLD, 12));
        btn.setCursor(new Cursor(Cursor.HAND_CURSOR));
        btn.addActionListener(e -> tabs.setSelectedIndex(index));
        sidebar.add(btn); sidebar.add(Box.createVerticalStrut(10));
    }
    private void styleTextField(JTextField tf) {
        tf.setBackground(COL_PANEL); tf.setForeground(COL_TEXT); tf.setCaretColor(COL_ACCENT);
        tf.setBorder(BorderFactory.createCompoundBorder(new LineBorder(COL_BORDER), new EmptyBorder(5, 10, 5, 10)));
    }
    private void styleTextArea(JTextArea ta) {
        ta.setBackground(COL_PANEL); ta.setForeground(COL_TEXT); ta.setCaretColor(COL_ACCENT);
        ta.setLineWrap(true); ta.setBorder(new EmptyBorder(5, 5, 5, 5));
    }
    private void styleTabs(JTabbedPane tabs) {
        tabs.setUI(new javax.swing.plaf.basic.BasicTabbedPaneUI() {
            protected void installDefaults() { super.installDefaults(); }
            protected int calculateTabAreaHeight(int tabPlacement, int horizRunCount, int maxTabHeight) { return 0; }
        });
    }
    class StyledButton extends JButton {
        private Color baseColor;
        public StyledButton(String text, Color bg) { super(text); this.baseColor = bg; setContentAreaFilled(false); setFocusPainted(false); setBorderPainted(false); setForeground(Color.WHITE); setFont(new Font("SansSerif", Font.BOLD, 12)); setCursor(new Cursor(Cursor.HAND_CURSOR)); }
        @Override protected void paintComponent(Graphics g) {
            Graphics2D g2 = (Graphics2D) g.create();
            g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
            if (getModel().isPressed()) g2.setColor(baseColor.darker()); else if (getModel().isRollover()) g2.setColor(baseColor.brighter()); else g2.setColor(baseColor);
            g2.fillRoundRect(0, 0, getWidth(), getHeight(), 10, 10); g2.dispose(); super.paintComponent(g);
        }
    }
    class VaultCellRenderer extends JPanel implements ListCellRenderer<Map<String, Object>> {
        private JLabel name = new JLabel(); private JLabel user = new JLabel(); private JLabel icon = new JLabel();
        public VaultCellRenderer() {
            setLayout(new BorderLayout(10, 0)); setBorder(new EmptyBorder(10, 15, 10, 15)); setBackground(COL_BG);
            JPanel textPanel = new JPanel(new GridLayout(2, 1)); textPanel.setOpaque(false);
            name.setFont(new Font("SansSerif", Font.BOLD, 16)); name.setForeground(COL_TEXT);
            user.setFont(new Font("Monospaced", Font.PLAIN, 12)); user.setForeground(COL_TEXT_DIM);
            icon.setForeground(COL_ACCENT); icon.setFont(new Font("Monospaced", Font.BOLD, 20));
            icon.setPreferredSize(new Dimension(40, 40)); icon.setHorizontalAlignment(SwingConstants.CENTER); icon.setBorder(new LineBorder(COL_BORDER));
            textPanel.add(name); textPanel.add(user); add(icon, BorderLayout.WEST); add(textPanel, BorderLayout.CENTER);
        }
        @Override public Component getListCellRendererComponent(JList<? extends Map<String, Object>> list, Map<String, Object> value, int index, boolean isSelected, boolean cellHasFocus) {
            String n = (String) value.getOrDefault("name", "?"); name.setText(n); user.setText((String) value.getOrDefault("username", "")); icon.setText(n.isEmpty() ? "?" : n.substring(0, 1).toUpperCase());
            if (isSelected) { setBackground(COL_PANEL); icon.setBorder(new LineBorder(COL_ACCENT)); } else { setBackground(COL_BG); icon.setBorder(new LineBorder(COL_BORDER)); }
            return this;
        }
    }
    class LockerCellRenderer extends JPanel implements ListCellRenderer<Map<String, Object>> {
        private JLabel name = new JLabel(); private JLabel meta = new JLabel();
        public LockerCellRenderer() {
            setLayout(new BorderLayout(10, 0)); setBorder(new EmptyBorder(10, 15, 10, 15)); setBackground(COL_BG);
            JPanel textPanel = new JPanel(new GridLayout(2, 1)); textPanel.setOpaque(false);
            name.setFont(new Font("SansSerif", Font.BOLD, 14)); name.setForeground(COL_TEXT);
            meta.setFont(new Font("Monospaced", Font.PLAIN, 10)); meta.setForeground(COL_TEXT_DIM);
            textPanel.add(name); textPanel.add(meta);
            JLabel icon = new JLabel("FILE"); icon.setForeground(COL_AMBER); icon.setBorder(new LineBorder(COL_BORDER)); icon.setPreferredSize(new Dimension(40, 40)); icon.setHorizontalAlignment(SwingConstants.CENTER);
            add(icon, BorderLayout.WEST); add(textPanel, BorderLayout.CENTER);
        }
        @Override public Component getListCellRendererComponent(JList<? extends Map<String, Object>> list, Map<String, Object> value, int index, boolean isSelected, boolean cellHasFocus) {
            name.setText((String) value.getOrDefault("label", "Unknown File")); meta.setText("ID: " + ((String) value.getOrDefault("id", "???")).substring(0,8) + "..."); setBackground(isSelected ? COL_PANEL : COL_BG); return this;
        }
    }

    private static final int ITERATIONS = 210_000;
    private static final int GCM_TAG_LENGTH = 128;
    private static final int GCM_IV_LENGTH = 12;
    private static final byte[] MAGIC_BYTES = "BASTION1".getBytes(StandardCharsets.UTF_8);

    static class ChaosEngine {
        public static String decryptVault(String blobB64, String password) throws Exception {
            byte[] data = Base64.getDecoder().decode(blobB64);
            if (data.length < 28) throw new IllegalArgumentException("Invalid blob");
            byte[] salt = Arrays.copyOfRange(data, 0, 16);
            byte[] iv = Arrays.copyOfRange(data, 16, 28);
            byte[] ciphertext = Arrays.copyOfRange(data, 28, data.length);
            SecretKey key = deriveKey(password, salt);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(GCM_TAG_LENGTH, iv));
            
            byte[] plaintext = cipher.doFinal(ciphertext);
            
            // DEFRAME: [LENGTH 4B] + [PAYLOAD] + [PADDING]
            if (plaintext.length < 4) return new String(plaintext, StandardCharsets.UTF_8);
            
            ByteBuffer bb = ByteBuffer.wrap(plaintext);
            bb.order(ByteOrder.LITTLE_ENDIAN);
            // Java int is signed, so utilize long to avoid negatives for large sizes
            long claimedLen = Integer.toUnsignedLong(bb.getInt());
            
            if (claimedLen <= plaintext.length - 4) {
                byte[] actual = Arrays.copyOfRange(plaintext, 4, 4 + (int)claimedLen);
                return new String(actual, StandardCharsets.UTF_8);
            }
            
            return new String(plaintext, StandardCharsets.UTF_8);
        }

        private static SecretKey deriveKey(String password, byte[] salt) throws Exception {
            byte[] domain = "BASTION_VAULT_V1::".getBytes(StandardCharsets.UTF_8);
            byte[] finalSalt = new byte[domain.length + salt.length];
            System.arraycopy(domain, 0, finalSalt, 0, domain.length);
            System.arraycopy(salt, 0, finalSalt, domain.length, salt.length);
            SecretKeyFactory factory = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256");
            KeySpec spec = new PBEKeySpec(password.toCharArray(), finalSalt, ITERATIONS, 256);
            return new SecretKeySpec(factory.generateSecret(spec).getEncoded(), "AES");
        }

        public static String transmute(String entropyHex, String name, String username, int version, int length, boolean useSymbols) throws Exception {
            String salt = "BASTION_GENERATOR_V2::" + name.toLowerCase() + "::" + username.toLowerCase() + "::v" + version;
            int dkLen = length * 32; 
            SecretKeyFactory factory = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA512");
            KeySpec spec = new PBEKeySpec(entropyHex.toCharArray(), salt.getBytes(StandardCharsets.UTF_8), ITERATIONS, dkLen);
            byte[] buffer = factory.generateSecret(spec).getEncoded();
            String alpha = "abcdefghijklmnopqrstuvwxyz"; String caps = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"; String num = "0123456789"; String sym = "!@#$%^&*()_+-=[]{}|;:,.<>?";
            String pool = alpha + caps + num + (useSymbols ? sym : "");
            int limit = 256 - (256 % pool.length());
            StringBuilder out = new StringBuilder(); int i = 0;
            while(out.length() < length && i < buffer.length) {
                int b = Byte.toUnsignedInt(buffer[i++]);
                if (b < limit) out.append(pool.charAt(b % pool.length()));
            }
            return out.toString();
        }
        public static String bytesToHex(byte[] bytes) {
            StringBuilder sb = new StringBuilder(); for (byte b : bytes) sb.append(String.format("%02x", b)); return sb.toString();
        }
    }

    // [LockerEngine and TinyJson classes - same as before]
    static class LockerEngine {
        static class LockerResult { String id; String keyHex; byte[] artifact; }
        public static LockerResult encrypt(byte[] plaintext) throws Exception {
            LockerResult res = new LockerResult(); res.id = UUID.randomUUID().toString(); byte[] key = new byte[32]; byte[] iv = new byte[GCM_IV_LENGTH]; SecureRandom rng = new SecureRandom(); rng.nextBytes(key); rng.nextBytes(iv); res.keyHex = ChaosEngine.bytesToHex(key); SecretKeySpec keySpec = new SecretKeySpec(key, "AES"); Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding"); cipher.init(Cipher.ENCRYPT_MODE, keySpec, new GCMParameterSpec(GCM_TAG_LENGTH, iv)); byte[] ciphertext = cipher.doFinal(plaintext); ByteArrayOutputStream bos = new ByteArrayOutputStream(); bos.write(MAGIC_BYTES); bos.write(String.format("%-36s", res.id).getBytes(StandardCharsets.UTF_8)); bos.write(iv); bos.write(ciphertext); res.artifact = bos.toByteArray(); return res;
        }
        public static byte[] decrypt(byte[] artifact, String keyHex) throws Exception {
            if (artifact.length < 56) throw new IllegalArgumentException("Corrupted artifact"); byte[] magic = Arrays.copyOfRange(artifact, 0, 8); if (!Arrays.equals(magic, MAGIC_BYTES)) throw new IllegalArgumentException("Invalid Magic Bytes"); byte[] iv = Arrays.copyOfRange(artifact, 44, 56); byte[] ciphertext = Arrays.copyOfRange(artifact, 56, artifact.length); byte[] key = hexToBytes(keyHex); SecretKeySpec keySpec = new SecretKeySpec(key, "AES"); Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding"); cipher.init(Cipher.DECRYPT_MODE, keySpec, new GCMParameterSpec(GCM_TAG_LENGTH, iv)); return cipher.doFinal(ciphertext);
        }
        private static byte[] hexToBytes(String s) { int len = s.length(); byte[] data = new byte[len / 2]; for (int i = 0; i < len; i += 2) data[i / 2] = (byte) ((Character.digit(s.charAt(i), 16) << 4) + Character.digit(s.charAt(i+1), 16)); return data; }
    }
    static class ChaosLock {
        public static String getFileIdFromBlob(byte[] blob) { if (blob.length < 44) return null; byte[] idBytes = Arrays.copyOfRange(blob, 8, 44); return new String(idBytes, StandardCharsets.UTF_8).trim(); }
    }
    static class TinyJson {
        private String json; private int pos;
        public TinyJson(String json) { this.json = json; this.pos = 0; }
        public Object parse() {
            skipWhite(); if (pos >= json.length()) return null; char c = json.charAt(pos); if (c == '{') return parseObject(); if (c == '[') return parseArray(); if (c == '"') return parseString(); if (c == 't') { pos += 4; return true; } if (c == 'f') { pos += 5; return false; } if (c == 'n') { pos += 4; return null; } return parseNumber();
        }
        private Map<String, Object> parseObject() {
            Map<String, Object> map = new HashMap<>(); consume('{'); skipWhite(); if (peek() == '}') { consume('}'); return map; }
            while (true) { String key = parseString(); skipWhite(); consume(':'); Object val = parse(); map.put(key, val); skipWhite(); if (peek() == '}') { consume('}'); break; } consume(','); skipWhite(); } return map;
        }
        private List<Object> parseArray() {
            List<Object> list = new ArrayList<>(); consume('['); skipWhite(); if (peek() == ']') { consume(']'); return list; }
            while (true) { list.add(parse()); skipWhite(); if (peek() == ']') { consume(']'); break; } consume(','); skipWhite(); } return list;
        }
        private String parseString() {
            consume('"'); StringBuilder sb = new StringBuilder(); while (true) { char c = json.charAt(pos++); if (c == '"') break; if (c == '\\\\') { char next = json.charAt(pos++); if (next == '\"') sb.append('\"'); else if (next == '\\\\') sb.append('\\\\'); else if (next == '/') sb.append('/'); else if (next == 'b') sb.append('\\b'); else if (next == 'f') sb.append('\\f'); else if (next == 'n') sb.append('\\n'); else if (next == 'r') sb.append('\\r'); else if (next == 't') sb.append('\\t'); else if (next == 'u') { String hex = json.substring(pos, pos + 4); pos += 4; sb.append((char) Integer.parseInt(hex, 16)); } } else { sb.append(c); } } return sb.toString();
        }
        private Number parseNumber() {
            int start = pos; while (pos < json.length()) { char c = json.charAt(pos); if (c == '-' || c == '+' || c == '.' || c == 'e' || c == 'E' || Character.isDigit(c)) { pos++; } else { break; } } String numStr = json.substring(start, pos); if (numStr.contains(".") || numStr.contains("e") || numStr.contains("E")) { return Double.parseDouble(numStr); } return Long.parseLong(numStr);
        }
        private void skipWhite() { while (pos < json.length() && Character.isWhitespace(json.charAt(pos))) pos++; } private char peek() { return json.charAt(pos); } private void consume(char expected) { if (json.charAt(pos) != expected) throw new RuntimeException("Expected " + expected + " at " + pos); pos++; }
    }
}
`;
