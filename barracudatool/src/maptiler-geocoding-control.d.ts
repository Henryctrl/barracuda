// src/maptiler-geocoding-control.d.ts
declare module '@maptiler/geocoding-control' {
    import { IControl } from '@maptiler/sdk';
  
    interface GeocodingControlOptions {
      apiKey: string;
      marker?: boolean;
      // Add any other options you use here
    }
  
    export class GeocodingControl implements IControl {
      constructor(options: GeocodingControlOptions);
      onAdd(map: maplibregl.Map): HTMLElement;
      onRemove(): void;
    }
  }
  