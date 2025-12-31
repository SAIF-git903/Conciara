# Active and Primary Rules - Clarification

## 🎯 Current Behavior

### Skins
- **Only ONE skin can be active per website**
- When you activate a skin, all other skins for that website are automatically deactivated
- The active skin is used by the widget

### A/B Variations
- **Only ONE variation can be PRIMARY per skin** (this is what the widget uses)
- **Multiple variations CAN be ACTIVE** (for testing/analytics purposes)
- When you set a variation as primary, all other variations for that skin are automatically unset from primary
- The widget uses: **Primary variation → Active variation → First created**

**Important:** 
- `is_primary = true` → This is what the widget uses (only one per skin)
- `is_active = true` → Multiple can be active (for A/B testing)

### Dialog Trees
- **Only ONE tree can be active per A/B variation**
- When you activate a tree, all other trees for that variation are automatically deactivated
- The active tree is used by the widget

## 📊 Selection Priority

When the widget loads, it selects:

1. **Skin:** Active skin (only one exists)
2. **A/B Variation:** Primary variation → Active variation → First created
3. **Dialog Tree:** Active tree (only one exists)

## 🔧 How It Works

### When You Toggle a Skin to Active:
```
Before:
- Skin A: is_active = true ✅
- Skin B: is_active = false

After (activate Skin B):
- Skin A: is_active = false ❌ (automatically deactivated)
- Skin B: is_active = true ✅
```

### When You Set a Variation as Primary:
```
Before:
- Variation A: is_primary = true ✅, is_active = true
- Variation B: is_primary = false, is_active = true

After (set Variation B as primary):
- Variation A: is_primary = false ❌ (automatically unset), is_active = true
- Variation B: is_primary = true ✅, is_active = true
```

### When You Activate a Tree:
```
Before:
- Tree A: is_active = true ✅
- Tree B: is_active = false

After (activate Tree B):
- Tree A: is_active = false ❌ (automatically deactivated)
- Tree B: is_active = true ✅
```

## ⚠️ Important Notes

1. **Skins:** Only one active at a time (enforced automatically)
2. **A/B Variations:** 
   - Only one PRIMARY at a time (enforced automatically)
   - Multiple can be ACTIVE (this is intentional for A/B testing)
3. **Dialog Trees:** Only one active per variation (enforced automatically)

## 🎨 UI Indicators

- **Green "Active" badge:** Item is active
- **Blue "Primary" badge:** Variation is primary (highest priority)
- **Green check icon:** Item is active (click to deactivate)
- **Gray check icon:** Item is inactive (click to activate)
- **Blue star icon:** Variation is primary (click to remove)
- **Gray star icon:** Variation is not primary (click to set as primary)

## 💡 Best Practices

1. **For Production:** Set one skin as active, one variation as primary, one tree as active
2. **For A/B Testing:** Keep multiple variations active, but only one primary
3. **For Testing:** You can have multiple active variations, but the widget will use the primary one

