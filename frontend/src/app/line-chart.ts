import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Dependency-free SVG line chart that redraws whenever its input signal changes. */
@Component({
  selector: 'app-line-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg [attr.viewBox]="'0 0 ' + width + ' ' + height" preserveAspectRatio="none" role="img"
         [attr.aria-label]="label()">
      @for (g of grid(); track g.y) {
        <line [attr.x1]="0" [attr.x2]="width" [attr.y1]="g.y" [attr.y2]="g.y" class="grid" />
        <text [attr.x]="4" [attr.y]="g.y - 3" class="tick">{{ g.value }}</text>
      }
      @if (path()) {
        <path [attr.d]="path()" class="line" />
      }
    </svg>
  `,
  styles: `
    :host { display: block; }
    svg { width: 100%; height: 150px; }
    .grid { stroke: var(--grid); stroke-width: 1; }
    .tick { fill: var(--muted); font-size: 10px; }
    .line { fill: none; stroke: var(--accent); stroke-width: 2; vector-effect: non-scaling-stroke; }
  `,
})
export class LineChart {
  readonly values = input.required<number[]>();
  readonly label = input('Telemetry trend');

  protected readonly width = 400;
  protected readonly height = 150;

  private readonly range = computed(() => {
    const v = this.values();
    if (v.length === 0) return { min: 0, max: 1 };
    const min = Math.min(...v);
    const max = Math.max(...v);
    const pad = (max - min || 1) * 0.15;
    return { min: min - pad, max: max + pad };
  });

  protected readonly path = computed(() => {
    const v = this.values();
    if (v.length < 2) return '';
    const { min, max } = this.range();
    const step = this.width / (v.length - 1);
    return v
      .map((val, i) => {
        const x = i * step;
        const y = this.height - ((val - min) / (max - min)) * this.height;
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  });

  protected readonly grid = computed(() => {
    const { min, max } = this.range();
    return [0.25, 0.5, 0.75].map((f) => ({
      y: this.height - f * this.height,
      value: (min + (max - min) * f).toFixed(1),
    }));
  });
}
