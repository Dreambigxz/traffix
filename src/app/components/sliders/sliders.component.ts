import { CommonModule } from '@angular/common';
import {
  Component,
  OnDestroy,
  OnInit
} from '@angular/core';

interface NewsSlide {
  id: number;
  badge: string;
  title: string;
  description: string;
  image: string;
  time: string;
  category: string;
}
@Component({
  selector: 'app-sliders',
  imports: [
    CommonModule
  ],
  templateUrl: './sliders.component.html',
  styleUrl: './sliders.component.scss'
})
export class SlidersComponent {

  activeSlide = 0;

  private sliderInterval?: ReturnType<typeof setInterval>;
  private touchStartX = 0;

  slides: any = [
    {
      image:
        '/assets/images/slides/slide2.jpeg',
        id: 1,

    },
    {
      image:
        '/assets/images/slides/slide1.jpg',
        id: 2,

    },

    {
      image:
        '/assets/images/slides/slide3.jpg',
        id: 2,

    },
  ];

  ngOnInit(): void {
    this.startSlider();
  }

  ngOnDestroy(): void {
    this.pauseSlider();
  }

  startSlider(): void {
    this.pauseSlider();

    this.sliderInterval = setInterval(() => {
      this.nextSlide();
    }, 5000);
  }

  pauseSlider(): void {
    if (this.sliderInterval) {
      clearInterval(this.sliderInterval);
      this.sliderInterval = undefined;
    }
  }

  nextSlide(): void {
    this.activeSlide =
      (this.activeSlide + 1) % this.slides.length;
  }

  previousSlide(): void {
    this.activeSlide =
      (this.activeSlide - 1 + this.slides.length) %
      this.slides.length;
  }

  goToSlide(index: number): void {
    this.activeSlide = index;
    this.startSlider();
  }

  onTouchStart(event: TouchEvent): void {
    this.touchStartX = event.changedTouches[0].clientX;
    this.pauseSlider();
  }

  onTouchEnd(event: TouchEvent): void {
    const touchEndX = event.changedTouches[0].clientX;
    const distance = this.touchStartX - touchEndX;

    if (Math.abs(distance) > 50) {
      distance > 0
        ? this.nextSlide()
        : this.previousSlide();
    }

    this.startSlider();
  }


}
