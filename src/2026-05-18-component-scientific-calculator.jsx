import React from 'react';
import { NormalCalculator } from './2026-05-18-component-normal-calculator.jsx';

// Scientific mode is the normal calculator with the `scientific` flag flipped
// on — so it renders the extra √ x² xⁿ ( ) row and the M+ M− MR MC memory
// strip. The implementation lives in NormalCalculator to avoid duplication
// and to keep one display/keyboard handler.
export const ScientificCalculator = () => <NormalCalculator scientific />;
