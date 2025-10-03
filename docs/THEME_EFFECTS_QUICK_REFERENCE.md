# 🎨 Theme Effects - Quick Reference Card

> **⚡ Quick copy-paste examples for the most common effects**

---

## 🚀 Most Used Classes

### Cards
```tsx
// Premium 3D Card
<Card className="card-premium">...</Card>

// Modern Interactive Card
<Card className="interactive-card card-spotlight">...</Card>

// Glass Card
<Card className="glass-card">...</Card>

// 3D Card Only
<Card className="effect-3d-card">...</Card>
```

### Buttons
```tsx
// Premium Button (All Effects)
<Button className="button-premium">Click Me</Button>

// Modern Button (Ripple + Morph)
<Button className="button-modern">Click Me</Button>

// Enhanced Button (Ripple + Elastic)
<Button className="btn-enhanced">Click Me</Button>

// With Glow
<Button className="btn-enhanced glow-primary">Click Me</Button>
```

### Text Effects
```tsx
// Gradient Flow Text
<h1 className="text-gradient-flow">Heading</h1>

// Neon Text
<h2 className="text-neon">Glowing Text</h2>
```

### Loading
```tsx
// Advanced Shimmer
<div className="loading-shimmer h-32 rounded" />

// Gradient Shimmer
<div className="loading-shimmer-gradient h-24 rounded" />
```

### Scroll Animations
```tsx
// Fade Up
<div className="reveal-on-scroll">...</div>

// From Left
<div className="reveal-from-left">...</div>

// From Right
<div className="reveal-from-right">...</div>

// Scale Up
<div className="reveal-scale">...</div>
```

### List Animations
```tsx
// Auto-stagger Children
<div className="stagger-container space-y-4">
  <Card>Item 1</Card>
  <Card>Item 2</Card>
  <Card>Item 3</Card>
</div>
```

---

## 🎯 Effect Combinations

```tsx
// Dashboard Widget
<Card className="glass-card card-spotlight hover-scale-sm transition-smooth">
  ...
</Card>

// Hero Card
<Card className="card-premium reveal-scale">
  <CardHeader className="border-gradient-animated">
    <CardTitle className="text-gradient-flow">Hero Title</CardTitle>
  </CardHeader>
</Card>

// Interactive Button
<Button className="button-premium glow-primary hover-scale-md">
  Action
</Button>

// Feature Card
<Card className="effect-3d-card effect-glass reveal-on-scroll">
  ...
</Card>
```

---

## 🎨 By Use Case

### Dashboard
```tsx
<Card className="glass-card card-spotlight transition-smooth">
  <div className="loading-shimmer-gradient h-32" />
</Card>
```

### Hero Section
```tsx
<div className="reveal-scale">
  <h1 className="text-gradient-flow text-6xl">Welcome</h1>
  <Button className="button-premium glow-primary mt-8">
    Get Started
  </Button>
</div>
```

### Feature List
```tsx
<div className="stagger-container grid grid-cols-3 gap-6">
  <Card className="interactive-card">Feature 1</Card>
  <Card className="interactive-card">Feature 2</Card>
  <Card className="interactive-card">Feature 3</Card>
</div>
```

### Pricing Cards
```tsx
<Card className="card-premium hover-scale-md transition-elastic">
  <CardHeader className="border-gradient-animated">
    <CardTitle className="text-gradient-flow">Pro Plan</CardTitle>
  </CardHeader>
  <CardContent>
    <Button className="button-premium w-full glow-primary">
      Subscribe
    </Button>
  </CardContent>
</Card>
```

---

## ⚡ Programmatic Init

```tsx
'use client';
import { useEffect } from 'react';
import { initThemeEffects } from '@/lib/theme-effects-utils';
import { useTheme } from '@/components/theme-provider';

export function MyComponent() {
  const { theme } = useTheme();

  useEffect(() => {
    const cleanup = initThemeEffects(theme);
    return cleanup;
  }, [theme]);

  return <div>...</div>;
}
```

---

## 🎭 Theme-Specific

### Emerald Garden 🌿
```tsx
<div className="theme-emerald-garden">
  <Card className="glass-card effect-float">
    Nature Design
  </Card>
</div>
```

### Royal Purple 👑
```tsx
<div className="theme-royal-purple">
  <Button className="button-premium glow-primary">
    Premium Action
  </Button>
</div>
```

### Ocean Deep 🌊
```tsx
<div className="theme-ocean-deep">
  <Card className="interactive-card theme-liquid">
    Fluid Design
  </Card>
</div>
```

### Orange Neon 🔥
```tsx
<div className="theme-orange-neon">
  <h1 className="text-neon text-5xl">
    Neon Title
  </h1>
</div>
```

---

## 📐 Layout Patterns

### Grid with Stagger
```tsx
<div className="stagger-container grid grid-cols-3 gap-6">
  {items.map(item => (
    <Card key={item.id} className="interactive-card">
      {item.content}
    </Card>
  ))}
</div>
```

### Hero with Parallax
```tsx
<div className="relative h-screen overflow-hidden">
  <div className="theme-parallax-layer-1 absolute inset-0 bg-pattern" />
  <div className="theme-parallax-layer-2 relative z-10">
    <h1 className="text-gradient-flow">Hero Title</h1>
  </div>
</div>
```

### Card Showcase
```tsx
<div className="grid grid-cols-2 gap-8">
  <Card className="card-premium reveal-from-left">Left Card</Card>
  <Card className="card-premium reveal-from-right">Right Card</Card>
</div>
```

---

## 🔧 Modifiers

### Hover Scales
```tsx
<div className="hover-scale-sm">Small (1.02)</div>
<div className="hover-scale-md">Medium (1.05)</div>
<div className="hover-scale-lg">Large (1.1)</div>
```

### Transitions
```tsx
<div className="transition-smooth">Smooth</div>
<div className="transition-bounce">Bouncy</div>
<div className="transition-elastic">Elastic</div>
```

### Performance
```tsx
<div className="gpu-boost">GPU Accelerated</div>
```

---

## 🎨 Special Effects

### Morphing Shape
```tsx
<div className="shape-liquid w-32 h-32 bg-primary/20" />
```

### Floating Icon
```tsx
<div className="effect-float">
  <Icon className="w-16 h-16" />
</div>
```

### Vignette Card
```tsx
<Card className="with-vignette">
  Dark edges
</Card>
```

### Gradient Border
```tsx
<Card className="border-gradient-animated">
  Animated border
</Card>
```

---

## 📦 All Preset Classes

| Class | Effect |
|-------|--------|
| `.card-premium` | 3D + Glass + Glow |
| `.card-modern` | 3D + Spotlight |
| `.card-elegant` | Glass + Vignette |
| `.button-premium` | Ripple + Elastic + Glow |
| `.button-modern` | Ripple + Morph |
| `.btn-enhanced` | Ripple + Elastic |
| `.interactive-card` | 3D + Magnetic + Pointer |
| `.glass-card` | Enhanced Glass + Padding |

---

## 💡 Pro Tips

1. **Combine effects** for unique results:
   ```tsx
   <Card className="effect-3d-card effect-glass effect-glow">
   ```

2. **Use presets** for consistency:
   ```tsx
   <Card className="card-premium">
   ```

3. **Add transitions** for smoothness:
   ```tsx
   <div className="interactive-card transition-smooth">
   ```

4. **Theme-specific glows**:
   ```tsx
   <Button className="glow-primary">
   ```

5. **Performance boost**:
   ```tsx
   <div className="gpu-boost effect-float">
   ```

---

## 📚 Full Documentation

👉 See `/docs/THEME_EFFECTS_GUIDE.md` for complete documentation

---

**Quick Reference Version:** 1.0.0  
**Last Updated:** 2025-09-30