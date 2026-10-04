import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewsCategoriesNavComponent } from './news-categories-nav.component';

describe('NewsCategoriesNavComponent', () => {
  let component: NewsCategoriesNavComponent;
  let fixture: ComponentFixture<NewsCategoriesNavComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewsCategoriesNavComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NewsCategoriesNavComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
