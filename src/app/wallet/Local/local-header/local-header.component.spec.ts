import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LocalHeaderComponent } from './local-header.component';

describe('LocalHeaderComponent', () => {
  let component: LocalHeaderComponent;
  let fixture: ComponentFixture<LocalHeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LocalHeaderComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LocalHeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
