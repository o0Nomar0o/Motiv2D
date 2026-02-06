# 2026.02/v1.0.0-a

### SUMMARY
- Runtime support (Spine 3.8, 4.0, 4.1). 
- Slot filtering with Boolean logic ( `||` ).
- Interactive Slot Picker—click the character to select layers. 

---

### FEATURE SET

#### 1. MULTI-RUNTIME SUPPORT
Unified player integration for three major Spine versions:
- **Spine 3.8**
- **Spine 4.0**
- **Spine 4.1**

#### 2.  SLOT/LAYER MANAGEMENT
- **Visibility Control**: Toggle individual slots or entire group hierarchies.
- **Power Search**: Advanced filtering using Boolean-style logic.
    - Use `||` for OR logic (e.g., `background || sky`).
- **Smart Grouping**: Slots with identical naming conventions are automatically grouped (max 10 per group) to prevent list bloat.

#### 3. INTERACTIVE SLOT PICKER
- **Direct Interaction**: Click directly on the character in the viewport to instantly select the corresponding slot/layer.

---

### KNOWN ISSUES & BUGS

#### ASSET PIPELINE
- **Atlas Mismatch**: Characters where the Atlas determined size differs from the real image size will render incorrectly. 
    - Affected Assets: Mainly Diablos Core and some files from Anchor Panic.
    - Note: Daiblos Core Assets from the GitHub Repo are fixed.

#### STATE PERSISTENCE
- **PMA Settings**: Premultiplied Alpha toggle does not currently save to the local config.
- **Outfits**: Selected outfit indices are not yet stored between sessions.

#### STABILITY
- **Slot Picker**: Hit detection can be inconsistent on heavily overlapping meshes.
- **Initialization**: Some characters require manual centering on load.
    - Example: Angelica FatedGuest (Brown Dust 2) spawns off-camera; use the `CENTER_CAMERA` button to view.

---

### REMARK
This is an **Alpha Build**. While the core rendering is stable, the focus is currently on refining the interaction logic and state persistence.

---

