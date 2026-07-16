import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

interface BarcodeProps {
  /** The value to encode in the barcode */
  value: string;
  /** Width of each bar module (default: 2) */
  width?: number;
  /** Height of the barcode in pixels (default: 40) */
  height?: number;
  /** Display the human-readable text below the barcode (default: true) */
  displayValue?: boolean;
  /** Font size of the text (default: 12) */
  fontSize?: number;
  /** Additional CSS class names */
  className?: string;
  /** Format type (default: 'CODE128') */
  format?: string;
  /** Color of the bars (default: '#27272a') */
  lineColor?: string;
  /** Background color (default: 'transparent') */
  background?: string;
  /** Margin around the barcode (default: 0) */
  margin?: number;
  /** Show a flat barcode without any container styling */
  flat?: boolean;
}

export default function Barcode({
  value,
  width = 2,
  height = 40,
  displayValue = true,
  fontSize = 12,
  className = '',
  format = 'CODE128',
  lineColor = '#27272a',
  background = 'transparent',
  margin = 0,
  flat = false,
}: BarcodeProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, value, {
          format,
          width,
          height,
          displayValue,
          fontSize,
          lineColor,
          background,
          margin,
          valid: () => true,
        });
      } catch (err) {
        console.warn('Error generating barcode:', err);
      }
    }
  }, [value, width, height, displayValue, fontSize, format, lineColor, background, margin]);

  if (!value) return null;

  if (flat) {
    return (
      <svg
        ref={svgRef}
        className={className}
        style={{ display: 'block' }}
      />
    );
  }

  return (
    <div className={`inline-flex flex-col items-center ${className}`}>
      <svg
        ref={svgRef}
        style={{ display: 'block', maxWidth: '100%' }}
      />
    </div>
  );
}
