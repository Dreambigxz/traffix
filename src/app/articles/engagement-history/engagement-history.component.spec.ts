import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EngagementHistoryComponent } from './engagement-history.component';

describe('EngagementHistoryComponent', () => {
  let component: EngagementHistoryComponent;
  let fixture: ComponentFixture<EngagementHistoryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EngagementHistoryComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EngagementHistoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
