# Ideal Design: Active vs Primary - Best Practices

## 🎯 Current Implementation Analysis

### Skins
**Current:** Only ONE active at a time ✅
**Ideal:** Only ONE active at a time ✅

**Reasoning:**
- A website needs ONE theme/design at a time
- Widget needs to know which theme to apply
- Multiple active = confusion (which theme to use?)

---

### A/B Variations
**Current:** Multiple can be active, only ONE primary ✅
**Ideal:** Multiple can be active, only ONE primary ✅

**Reasoning:**
- **Active** = Available for testing/analytics (multiple allowed)
- **Primary** = The one the widget actually uses (only one)
- This allows A/B testing: You can have multiple variations active, but only one is "live" (primary)

**Widget Selection:**
```
Priority 1: Primary variation (is_primary = true)
Priority 2: Active variation (is_active = true, if no primary)
Priority 3: First created (fallback)
```

---

### Dialog Trees
**Current:** Only ONE active per variation ✅
**Ideal:** Only ONE active per variation ✅

**Reasoning:**
- A variation needs ONE conversation flow at a time
- Widget needs to know which dialog tree to use
- Multiple active = confusion (which flow to follow?)

---

## 🎯 Ideal Design Summary

### ✅ Keep Current Design (It's Good!)

| Entity | Active Count | Primary Count | Widget Uses |
|--------|-------------|---------------|-------------|
| **Skins** | 1 per website | N/A | Active skin |
| **A/B Variations** | Multiple allowed | 1 per skin | Primary → Active → First |
| **Dialog Trees** | 1 per variation | N/A | Active tree |

### Why This Design Works:

1. **Skins:** One active = Clear theme selection
2. **A/B Variations:** 
   - Multiple active = Can test multiple variations
   - One primary = Widget knows which one to use
   - Perfect for A/B testing workflows
3. **Dialog Trees:** One active = Clear conversation flow

---

## 🔄 Alternative Designs (Not Recommended)

### Option 1: Multiple Active Everything
**Problem:** Widget can't decide which one to use
**Solution Needed:** Add priority/order fields
**Verdict:** ❌ Too complex, unnecessary

### Option 2: Only Primary, No Active
**Problem:** Can't have multiple variations for testing
**Verdict:** ❌ Limits A/B testing capabilities

### Option 3: Only Active, No Primary
**Problem:** If multiple active, which one does widget use?
**Solution Needed:** Add priority/order fields
**Verdict:** ❌ Less clear than current design

---

## 💡 Current Design Benefits

### For A/B Testing:
```
Scenario: Testing two variations

Variation A: is_active = true, is_primary = true ✅ (Widget uses this)
Variation B: is_active = true, is_primary = false (Testing, but not live)

You can:
- Switch primary from A to B (make B live)
- Keep both active for analytics
- Compare performance
```

### For Production:
```
Scenario: One live variation

Variation A: is_active = true, is_primary = true ✅ (Widget uses this)
Variation B: is_active = false, is_primary = false (Draft/archived)
```

### For Development:
```
Scenario: Multiple variations in development

Variation A: is_active = true, is_primary = true ✅ (Current live)
Variation B: is_active = true, is_primary = false (In testing)
Variation C: is_active = true, is_primary = false (In development)
```

---

## 🎨 Widget Selection Logic (Current)

```typescript
// 1. Get active skin (only one exists)
const skin = await getActiveSkin(websiteId);

// 2. Get variation (priority: primary → active → first)
let variation = await getPrimaryVariation(skinId);
if (!variation) {
  variation = await getActiveVariation(skinId);
}
if (!variation) {
  variation = await getFirstVariation(skinId);
}

// 3. Get active tree (only one exists)
const tree = await getActiveTree(variationId);
```

---

## ✅ Recommendation: Keep Current Design

**Why:**
1. ✅ Clear and intuitive
2. ✅ Supports A/B testing workflows
3. ✅ Widget always knows which item to use
4. ✅ No ambiguity
5. ✅ Flexible for different use cases

**The current design is ideal!** The only improvement would be to make the UI clearer about:
- What "active" means vs "primary"
- Which item the widget is actually using

---

## 🔧 Potential UI Improvements

### Add Visual Indicators:

1. **"Widget Using" Badge:**
   - Show which skin/variation/tree the widget is currently using
   - Different color (e.g., purple) to distinguish from "active"

2. **Tooltips:**
   - "Active" = Available for use/testing
   - "Primary" = Currently used by widget (highest priority)

3. **Status Summary:**
   - Show at the top: "Widget is using: Skin X → Variation Y → Tree Z"

---

## 📊 Decision Matrix

| Scenario | Multiple Active? | Widget Decision |
|----------|------------------|-----------------|
| **Production** | No | Use the one active item |
| **A/B Testing** | Yes (variations) | Use primary variation |
| **Development** | Yes (variations) | Use primary variation |
| **Multiple Themes** | No (skins) | Use the one active skin |
| **Multiple Flows** | No (trees) | Use the one active tree |

---

## 🎯 Final Answer

**Ideal Design:**
- ✅ **Skins:** Only ONE active (current is correct)
- ✅ **A/B Variations:** Multiple active allowed, only ONE primary (current is correct)
- ✅ **Dialog Trees:** Only ONE active per variation (current is correct)

**Widget Decision:**
- Uses **Primary** variation (if exists)
- Falls back to **Active** variation (if no primary)
- Falls back to **First created** (if no active)

**The current design is ideal!** No changes needed. Just make the UI clearer about what "active" vs "primary" means.

