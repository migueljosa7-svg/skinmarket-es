// src/components/battles/SectionHeader.jsx
// Section header for battle configuration modal.
// Extracted from Battles.jsx (PHASE 6.2 refactor).

const SectionHeader = ({ num, label, noMargin }) => (
  <h3
    style={{
      color: "white",
      marginBottom: noMargin ? 0 : "12px",
      fontSize: "1rem",
      display: "flex",
      alignItems: "center",
      gap: "8px",
    }}
  >
    <span
      style={{
        background: "#f5ac3b",
        color: "black",
        width: "22px",
        height: "22px",
        borderRadius: "50%",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "0.75rem",
        fontWeight: "bold",
        flexShrink: 0,
      }}
    >
      {num}
    </span>
    {label}
  </h3>
);

export default SectionHeader;