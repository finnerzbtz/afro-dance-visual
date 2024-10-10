'use client';

import React, { useRef, useEffect, useState } from 'react';
import { useP5 } from '../hooks/useP5';
import p5 from 'p5';

const colors = ['#FF0000', '#FFFF00', '#008000', '#000000']; // Red, Yellow, Green, Black
const wordList = ['Dance', 'Rhythm', 'Unity', 'Aquinas2024', 'Culture Day'];

const MAX_CIRCLES = 50;
const MAX_WORDS = 20;
const BASE_GROWTH_RATE = 500;

interface Circle {
  x: number;
  y: number;
  size: number;
  color: [number, number, number]; // [r, g, b]
  alpha: number;
}

interface Word {
  text: string;
  x: number;
  y: number;
  size: number;
  opacity: number;
  lifespan: number;
  isFlashing: boolean;
  flashDuration: number;
}

type P5Slider = p5.Element & { elt: { value: number } };

const hexToRgb = (hex: string): [number, number, number] => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16)
  ] : [0, 0, 0];
};

const Sketch: React.FC = () => {
  const sketchRef = useRef<HTMLDivElement>(null);
  const p5Instance = useP5();
  const [sketch, setSketch] = useState<((p: p5) => void) | null>(null);

  useEffect(() => {
    if (!p5Instance) return;

    const newSketch = (p: any) => {
      let mic: any;
      const circles: Circle[] = [];
      const waveform: number[] = [];
      const waveformResolution = 100;
      let fullscreenButton: p5.Element;
      let sensitivitySlider: P5Slider;
      let flashSensitivitySlider: P5Slider;
      let circleSensitivitySlider: P5Slider;
      let wordFrequencySlider: P5Slider;
      let wordDurationSlider: P5Slider;
      const sliderLabels: p5.Element[] = [];
      let isFullscreen = false;
      const words: Word[] = [];
      let wordTimer = 0;
      let customFont: p5.Font;
      let lastFlashTime = 0;
      const minTimeBetweenFlashes = 500;
      let halfWidth: number;
      let halfHeight: number;

      const drawHeart = (x: number, y: number, size: number) => {
        p.push();
        p.translate(x, y);

        // Create a radial gradient with green colors
        const gradient = p.drawingContext.createRadialGradient(
          0, size/8, 0,
          0, size/8, size*1.2
        );
        gradient.addColorStop(0, p.color(150, 255, 150).toString());
        gradient.addColorStop(0.7, p.color(0, 200, 0).toString());
        gradient.addColorStop(1, p.color(0, 150, 0).toString());

        p.drawingContext.fillStyle = gradient;

        // Draw the main heart shape
        p.beginShape();
        p.vertex(0, size/4);
        p.bezierVertex(0, -size/10, -size/2, -size/4, -size/2, size/4);
        p.bezierVertex(-size/2, size/2, -size/4, size*3/4, 0, size);
        p.bezierVertex(size/4, size*3/4, size/2, size/2, size/2, size/4);
        p.bezierVertex(size/2, -size/4, 0, -size/10, 0, size/4);
        p.endShape(p.CLOSE);

        // Add a highlight
        p.noStroke();
        p.fill(255, 255, 255, 50);
        p.ellipse(-size/6, -size/8, size/3, size/3);

        p.pop();
      };

      p.preload = () => {
        customFont = p.loadFont('/Kokoschka.ttf');
      };

      p.setup = () => {
        const canvasWidth = p.windowWidth;
        const canvasHeight = p.windowHeight;
        p.createCanvas(canvasWidth, canvasHeight);
        p.frameRate(30); // or 60, depending on your preference
        console.log('Initializing microphone');
        mic = new p5.AudioIn();
        mic.start();
        console.log('Microphone initialized');
        // Initialize waveform array
        for (let i = 0; i < waveformResolution; i++) {
          waveform[i] = 0;
        }

        halfWidth = p.width / 2;
        halfHeight = p.height / 2;

        // Create fullscreen button
        fullscreenButton = p.createButton('Fullscreen');
        fullscreenButton.position(10, 10);
        fullscreenButton.mousePressed(() => {
          isFullscreen = !isFullscreen;
          p.fullscreen(isFullscreen);
          updateControlsVisibility();
        });

        // Create sliders
        sensitivitySlider = p.createSlider(0, 1, 0.5, 0.01) as P5Slider;
        sensitivitySlider.position(10, 40);
        sensitivitySlider.style('width', '200px');

        flashSensitivitySlider = p.createSlider(0, 1, 0.8, 0.01) as P5Slider;
        flashSensitivitySlider.position(10, 70);
        flashSensitivitySlider.style('width', '200px');

        circleSensitivitySlider = p.createSlider(0, 1, 0.5, 0.01) as P5Slider;
        circleSensitivitySlider.position(10, 100);
        circleSensitivitySlider.style('width', '200px');

        wordFrequencySlider = p.createSlider(1, 10, 5, 1) as P5Slider;
        wordFrequencySlider.position(10, 130);
        wordFrequencySlider.style('width', '200px');

        wordDurationSlider = p.createSlider(1, 10, 3, 1) as P5Slider;
        wordDurationSlider.position(10, 160);
        wordDurationSlider.style('width', '200px');

        // Create labels
        const labelTexts = ['Overall Sensitivity', 'Flash Sensitivity', 'Circle Sensitivity', 'Word Frequency', 'Word Duration'];
        labelTexts.forEach((text, index) => {
          const label = p.createDiv(text);
          label.position(220, 45 + index * 30);
          label.style('font-size', '12px');
          sliderLabels.push(label);
        });

        updateControlsVisibility();
      };

      const updateControlsVisibility = () => {
        const displayStyle = isFullscreen ? 'none' : 'block';
        fullscreenButton.style('display', displayStyle);
        sensitivitySlider.style('display', displayStyle);
        flashSensitivitySlider.style('display', displayStyle);
        circleSensitivitySlider.style('display', displayStyle);
        wordFrequencySlider.style('display', displayStyle);
        wordDurationSlider.style('display', displayStyle);
        sliderLabels.forEach(label => label.style('display', displayStyle));
      };

      p.windowResized = () => {
        p.resizeCanvas(p.windowWidth, p.windowHeight);
        halfWidth = p.width / 2;
        halfHeight = p.height / 2;
      };

      p.mousePressed = () => {
        console.log('Mouse pressed, starting audio');
        p.userStartAudio().then(() => {
          console.log('Audio context started');
        }).catch((error: Error) => {
          console.error('Failed to start audio context:', error);
        });
      };

      p.draw = () => {
        if (!mic) {
          console.log('Microphone not initialized');
          return;
        }

        p.background('#FFF44F');

        const vol = mic.getLevel() * sensitivitySlider.elt.value;
        console.log('Current volume:', vol);
        console.log('Circle sensitivity:', circleSensitivitySlider.elt.value);
        console.log('Flash sensitivity:', flashSensitivitySlider.elt.value);

        let size = p.map(vol, 0, 0.1, 50, p.min(p.width, p.height) / 2);
        size = p.constrain(size, 50, p.min(p.width, p.height) / 2);

        // Draw heart and waveform (as before)
        drawHeart(halfWidth, halfHeight * 0.8, size);
        // ... (waveform drawing code)

        // Add new circles based on volume
        if (vol > circleSensitivitySlider.elt.value && circles.length < MAX_CIRCLES) {
          const randomColor = colors[Math.floor(Math.random() * colors.length)];
          const rgbColor = hexToRgb(randomColor);
          circles.push({
            x: p.random(p.width),
            y: p.random(p.height),
            size: 10,
            color: rgbColor,
            alpha: 255
          });
        }

        // Update and display circles
        for (let i = circles.length - 1; i >= 0; i--) {
          const circle = circles[i];
          circle.size += vol * BASE_GROWTH_RATE * (p.deltaTime / 16.67);
          circle.alpha -= 5;

          p.fill(circle.color[0], circle.color[1], circle.color[2], circle.alpha);
          p.noStroke();
          p.ellipse(circle.x, circle.y, circle.size, circle.size);

          if (circle.alpha <= 0 || circle.size > p.max(p.width, p.height)) {
            circles.splice(i, 1);
          }
        }

        // Add new word based on volume and frequency
        wordTimer += vol * 10;
        if (wordTimer > wordFrequencySlider.elt.value && words.length < MAX_WORDS) {
          words.push({
            text: wordList[Math.floor(Math.random() * wordList.length)],
            x: p.random(p.width),
            y: p.random(p.height),
            size: p.map(vol, 0, 0.1, 60, 120),
            opacity: 255,
            lifespan: wordDurationSlider.elt.value * 60,
            isFlashing: false,
            flashDuration: 0
          });
          wordTimer = 0;
        }

        // Check for flash trigger
        const currentTime = p.millis();
        const shouldFlash = vol > flashSensitivitySlider.elt.value && (currentTime - lastFlashTime > minTimeBetweenFlashes);

        if (shouldFlash) {
          lastFlashTime = currentTime;
          words.forEach(word => {
            word.isFlashing = true;
            word.flashDuration = 15;
          });
        }

        // Update and display words
        p.textFont(customFont);
        p.textAlign(p.CENTER, p.CENTER);
        for (let i = words.length - 1; i >= 0; i--) {
          const word = words[i];
          word.lifespan--;

          // Update flash state
          if (word.isFlashing) {
            word.flashDuration--;
            if (word.flashDuration <= 0) {
              word.isFlashing = false;
            }
          }

          word.opacity = p.map(word.lifespan, wordDurationSlider.elt.value * 60, 0, 255, 0);

          if (word.lifespan > 0) {
            if (word.isFlashing) {
              p.fill(0, 255, 0, word.opacity); // Green color when flashing
            } else {
              p.fill(255, 0, 0, word.opacity); // Red color normally
            }
            p.textSize(word.size);
            p.text(word.text, word.x, word.y);
          } else {
            words.splice(i, 1);
          }
        }

        console.log('Number of circles:', circles.length);
        console.log('Number of words:', words.length);
      };
    };

    setSketch(() => newSketch);
  }, [p5Instance]);

  useEffect(() => {
    if (!p5Instance || !sketch || !sketchRef.current) return;

    const myp5 = new p5Instance(sketch, sketchRef.current);

    return () => {
      myp5.remove();
    };
  }, [p5Instance, sketch]);

  return <div ref={sketchRef} style={{ width: '100vw', height: '100vh', overflow: 'hidden' }} />;
};

export default Sketch;