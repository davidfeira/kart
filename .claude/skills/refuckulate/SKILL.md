---
name: refuckulate
description: Reorganize codebases that drifted from structure guidelines during vibe coding. Splits oversized files, extracts modules, and updates documentation - without changing behavior. Use when files get too long, code organization is messy, or you need to bring a codebase back in line with project guidelines.
user_invocable: true
---

# /refuckulate

Refuckulating is the art of reorganizing code that drifted from structure guidelines during vibe coding - without changing behavior. It's about moving code between files, not rewriting logic.

## What This Skill Does

1. **Survey** - Scans files for line count violations
2. **Analyze** - Identifies logical split points and dependencies
3. **Ask** - Confirms what the user wants refuckulated
4. **Plan** - Creates a dependency-ordered extraction plan
5. **Execute** - Extracts modules one by one
6. **Document** - Updates CHANGELOG, ARCHITECTURE, etc.
7. **Report** - Tells user exactly what to test

## When to Use

- Files have grown way too long (500+ lines)
- Code organization drifted from project guidelines
- Everything works but the codebase is a mess
- You want to modularize a monolithic file
- After a "vibe coding" session that got out of hand

## How It Works

### Step 1: Survey the Codebase

First, I'll check for project guidelines:
```
CLAUDE.md, .claude/settings.json, or similar
```

Then scan all code files for line counts:
```
Target: < 300 lines (configurable)
Warning: > 500 lines
Action required: > 800 lines
```

### Step 2: Ask What You Want Done

I'll show you the violations and ask:
- Which files to refuckulate?
- What's the target line count?
- Any files to skip?
- Should I set up logging infrastructure?

### Step 3: Plan the Extraction

For each oversized file, I'll identify:
- Logical sections (classes, functions, constants)
- Dependencies between sections
- Extraction order (leaves first, then dependents)
- New file names and locations

### Step 4: Execute the Refuckulation

For each extraction:
1. Create the new module file with proper imports/exports
2. Add import to the original file
3. Remove the extracted code from original
4. Verify imports resolve correctly

### Step 5: Update Documentation

- Add entry to CHANGELOG.md
- Update ARCHITECTURE.md with new structure
- Update any stale API documentation
- Update project guidelines if needed

### Step 6: What to Test

I'll tell you exactly what might have broken:
- "Test menu flow - MenuManager was extracted"
- "Test physics - Kart class was split"
- "Test track loading - TrackGenerator was moved"

## Configuration

You can customize thresholds in your project guidelines:

```markdown
### File Size Limits
- **Target**: 300 lines
- **Warning**: 500 lines
- **Action required**: 800 lines
```

## Example Usage

```
User: /refuckulate
Claude: Let me survey your codebase...

Found violations:
- index.html: 3,389 lines (ACTION REQUIRED)
- style.css: 961 lines (WARNING)

index.html contains 11 logical sections:
1. CONFIG (~76 lines)
2. InputManager (~133 lines)
3. Kart class (~1,340 lines) - LARGE
4. TrackGenerator (~615 lines) - LARGE
...

What would you like to refuckulate?
1. Full extraction (all sections to modules)
2. Large classes only (Kart, TrackGenerator)
3. Let me pick specific sections
4. Just show me the plan, don't execute
```

## Key Principles

### Don't Change Behavior
Refuckulating is purely structural. If tests pass before, they should pass after. If there are no tests, manual testing is critical.

### Dependency Order Matters
Extract in this order:
1. Constants and config (no dependencies)
2. Utility functions
3. Independent classes
4. Classes that depend on the above
5. Main orchestrator class (last)

### Keep Imports Clean
Each extracted module should:
- Import only what it needs
- Export a clear public interface
- Use relative paths consistently

### Be Conservative
When in doubt:
- Ask the user first
- Make smaller extractions
- Keep related code together
- Don't over-engineer the split

## Files This Skill May Create/Modify

Creates:
- `src/[category]/[ModuleName].js` - Extracted modules

Modifies:
- Original oversized files (removes extracted code)
- `docs/CHANGELOG.md` - Adds refuckulation entry
- `docs/ARCHITECTURE.md` - Updates file structure
- Project guidelines file - Updates current state
