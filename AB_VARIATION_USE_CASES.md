# A/B Variation Use Cases

## 🎯 Overview

A/B Variations allow you to test different UI configurations, conversation flows, and features on the same skin. They're perfect for experimentation, A/B testing, and gradual rollouts.

## 📊 How A/B Variations Work

### Selection Priority
1. **Primary Variation** (`is_primary = true`) - Highest priority, used by widget
2. **Active Variation** (`is_active = true`) - Fallback if no primary
3. **First Created** - Final fallback

### Override System
A/B Variations can override **any part** of the base skin configuration:

```json
{
  "overrides": {
    "theme.primaryColor": "#ff0000",
    "components.button.size": "small",
    "components.window.width": 320
  }
}
```

## 🚀 Use Cases

### 1. **A/B Testing UI Designs**

**Scenario:** Test if a smaller button increases engagement

**Base Skin:**
```json
{
  "components": {
    "button": {
      "size": "large",
      "position": "bottom-right"
    }
  }
}
```

**Variation A (Control):**
```json
{
  "overrides": {
    "components.button.size": "large"
  }
}
```

**Variation B (Test):**
```json
{
  "overrides": {
    "components.button.size": "small",
    "components.button.position": "bottom-left"
  }
}
```

**Usage:**
- Set both variations as `is_active = true`
- Set one as `is_primary = true` (the one you want to test)
- Switch primary to test the other
- Track metrics to see which performs better

---

### 2. **Seasonal/Themed Variations**

**Scenario:** Change colors and messaging for holidays

**Base Skin:** Default blue theme

**Christmas Variation:**
```json
{
  "overrides": {
    "theme.primaryColor": "#dc2626",
    "theme.backgroundColor": "#fef2f2",
    "components.header.title": "🎄 Holiday Chat"
  }
}
```

**Usage:**
- Create seasonal variation
- Set as `is_primary = true` during the season
- Switch back to base after season ends

---

### 3. **Mobile vs Desktop Optimizations**

**Scenario:** Different UI for mobile users

**Base Skin:** Desktop-optimized (384px width)

**Mobile Variation:**
```json
{
  "overrides": {
    "components.window.width": 320,
    "components.window.height": 500,
    "components.messages.showAvatars": false,
    "components.input.allowMultiline": false
  }
}
```

**Usage:**
- Detect mobile user
- Use `skinId` parameter to load mobile variation
- Or use JavaScript to switch based on screen size

---

### 4. **Feature Flags / Gradual Rollouts**

**Scenario:** Test new quick replies feature with 10% of users

**Base Skin:** No quick replies

**Feature Variation:**
```json
{
  "overrides": {
    "components.quickReplies.show": true,
    "components.quickReplies.style": "chips"
  }
}
```

**Usage:**
- Create variation with feature enabled
- Use JavaScript to randomly assign 10% of users
- Pass `skinId` or variation-specific config
- Gradually increase percentage

---

### 5. **Customer Segment Targeting**

**Scenario:** Different UI for premium vs free users

**Base Skin:** Standard theme

**Premium Variation:**
```json
{
  "overrides": {
    "theme.primaryColor": "#fbbf24",
    "components.header.title": "Premium Support",
    "components.window.shadow": "large"
  }
}
```

**Usage:**
- Detect user segment (premium/free)
- Load appropriate variation via `skinId`
- Or use different `websiteId` per segment

---

### 6. **Conversation Flow Testing**

**Scenario:** Test different conversation starters

**Base Skin:** Standard dialog tree

**Variation A:** Friendly greeting
**Variation B:** Direct question

**Usage:**
- Same skin, different dialog trees
- Each variation links to different tree
- Test which conversation flow converts better

---

### 7. **Time-Based Variations**

**Scenario:** Different UI during business hours

**Base Skin:** Standard theme

**After Hours Variation:**
```json
{
  "overrides": {
    "components.header.title": "We're Closed",
    "components.input.placeholder": "Leave a message...",
    "theme.primaryColor": "#6b7280"
  }
}
```

**Usage:**
- JavaScript checks current time
- Loads appropriate variation
- Or backend logic switches primary variation

---

### 8. **Geographic/Language Variations**

**Scenario:** Different UI for different regions

**Base Skin:** English, US colors

**EU Variation:**
```json
{
  "overrides": {
    "components.header.title": "Chat Support",
    "components.input.placeholder": "Type your message...",
    "theme.primaryColor": "#003399"
  }
}
```

**Usage:**
- Detect user location/language
- Load appropriate variation
- Or use different websites per region

---

### 9. **Performance Testing**

**Scenario:** Test if minimal UI loads faster

**Base Skin:** Full-featured (avatars, timestamps, etc.)

**Minimal Variation:**
```json
{
  "overrides": {
    "components.messages.showAvatars": false,
    "components.messages.showTimestamps": false,
    "components.header.showAvatar": false,
    "components.quickReplies.show": false
  }
}
```

**Usage:**
- Create minimal variation
- Test load times and performance
- Compare metrics

---

### 10. **Brand Customization**

**Scenario:** White-label solution with different brands

**Base Skin:** Generic theme

**Brand A Variation:**
```json
{
  "overrides": {
    "theme.primaryColor": "#brand-color-a",
    "components.header.title": "Brand A Support"
  }
}
```

**Brand B Variation:**
```json
{
  "overrides": {
    "theme.primaryColor": "#brand-color-b",
    "components.header.title": "Brand B Support"
  }
}
```

**Usage:**
- One skin, multiple brand variations
- Each client gets their variation
- Easy to manage and update

---

## 🎨 Best Practices

### 1. **Keep Base Skin Simple**
- Base skin should be the "default" or "fallback"
- Variations should only override what's different
- Makes it easier to maintain

### 2. **Use Descriptive Names**
- "Mobile Optimized"
- "Holiday Theme 2024"
- "Quick Replies Test"
- Makes it clear what each variation does

### 3. **Document Your Variations**
- Add descriptions explaining the purpose
- Note what metrics you're tracking
- Document when to use each variation

### 4. **Test Variations**
- Test in staging before production
- Verify overrides work correctly
- Check that dialog trees are linked

### 5. **Monitor Performance**
- Track which variation performs better
- Use analytics to measure impact
- Make data-driven decisions

### 6. **Clean Up Old Variations**
- Remove variations that are no longer needed
- Archive test variations
- Keep database clean

---

## 🔧 Technical Implementation

### Creating a Variation

```sql
INSERT INTO ab_variations (skin_id, name, description, variation_config, is_active)
VALUES (
  1,
  'Mobile Optimized',
  'Smaller window for mobile devices',
  '{"overrides": {"components.window.width": 320}}'::jsonb,
  true
);
```

### Setting as Primary

```sql
-- Unset all other primary variations for this skin
UPDATE ab_variations 
SET is_primary = false 
WHERE skin_id = 1;

-- Set this one as primary
UPDATE ab_variations 
SET is_primary = true 
WHERE id = 5;
```

### Using in Widget

```html
<!-- By skinId (uses primary variation) -->
<script>
  ConversaTree.init({
    apiUrl: 'http://localhost:3001/api',
    skinId: 1  // Uses primary variation automatically
  });
</script>

<!-- By websiteId (uses active skin + primary variation) -->
<script>
  ConversaTree.init({
    apiUrl: 'http://localhost:3001/api',
    websiteId: 1  // Auto-selects active skin + primary variation
  });
</script>
```

---

## 📈 Metrics to Track

When A/B testing, track:
- **Engagement:** Click-through rate, messages sent
- **Conversion:** Completed conversations, goals reached
- **Performance:** Load time, render time
- **User Satisfaction:** Ratings, feedback
- **Business Metrics:** Sales, sign-ups, etc.

---

## 🎯 Summary

A/B Variations are powerful for:
- ✅ Testing UI changes
- ✅ Seasonal/themed updates
- ✅ Feature rollouts
- ✅ Customer segmentation
- ✅ Performance optimization
- ✅ Brand customization
- ✅ Geographic targeting
- ✅ Time-based changes

The key is: **One base skin, multiple variations, easy switching!**

