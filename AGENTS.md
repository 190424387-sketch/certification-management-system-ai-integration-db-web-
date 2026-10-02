# Project AI Instructions

## 1. Protected Core Module: AI Classification Strategy
- **Files**: `src/components/AIPanel.tsx` and `src/data/custom_mappings.json`
- **Rule**: The fuzzy search, adjective scoping, and custom semantic mapping (`customMappings`) logic in `AIPanel.tsx` has been rigorously calibrated using hundreds of real-world test cases. 
- **Constraint**: DO NOT refactor, modify, or overwrite this core classification logic or the mapping JSON when implementing new features (e.g., project review modules, UI updates, etc.). Only modify them if the user explicitly requests an update to the "core classification strategy" or "matching logic".

## 2. Dynamic Target: Range Search and AI Smart Match Engine Strategy Calibration
- **Rule**: The next phase of development focuses on multi-group testing and calibration specifically for the **Range Search (范围检索功能)** and **AI Smart Match Engine (AI智能匹配引擎)** strategies.
- **Constraint**: 
  - All validation scripts, sample match configurations, and matching index optimizations MUST be fully isolated.
  - DO NOT alter any other functional modules, other visual panels, or the core classification logic of `AIPanel.tsx` and `custom_mappings.json` during this process.

