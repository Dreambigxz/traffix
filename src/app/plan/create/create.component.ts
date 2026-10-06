import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { QuickNavService } from '../../reuseables/services/quick-nav.service'; // ✅ adjust path as needed
import { SummaryComponent } from "../summary/summary.component";
import { HeaderComponent } from "../../components/header/header.component";

import { MobileMenuComponent } from "../../components/mobile-menu/mobile-menu.component";

@Component({
  selector: 'app-create',
  imports: [
    CommonModule,
    // SummaryComponent,
    HeaderComponent,
    MobileMenuComponent
  ],
  templateUrl: './create.component.html',
  styleUrl: './create.component.scss'
})
export class CreatePlanComponent {

  constructor(
    public quickNav:QuickNavService,
  ){}

  readonly rewardPerTask = 0.20;
  readonly durationDays = 70;

  activePlanKeys: string[]  = []

  /*
   * Populate this from Django.
   *
   * Example:
   * completedPlanKeys = ['vip1', 'vip2', 'vip3'];
   */
  completedPlanKeys: string[] = [];

  selectedPlan: any | null = null;
  activationMessage = '';

  plans: any = []

  ngOnInit(){

    // this.plans = this.quickNav.storeData.get("plans")

    if (!this.quickNav.storeData.get("my_plans")) {
      this.quickNav.reqServerData.get("plans/")
      .subscribe((res:any)=>{
        this.loadData()
      })
    }else{
      this.loadData() 
    }
  }

  loadData(){

    const plans = this.quickNav.storeData.get("plans")

    this.activePlanKeys = this.hasPlan.map((plan:any) => plan.plan_id);
    this.completedPlanKeys = this.quickNav.storeData.get('my_plans')?.completed?.map((plan:any) => plan.plan_id) || [];


    let total_days_joined = this.quickNav.daysSinceJoined
    if (total_day_joined > 2){
      plans[0].hide =  true
      plans[0].change =  true

    }

    console.log({total_days_joined});

    this.plans = plans


    console.log({plan:this.plans});

  }


  isLocked(plan: any): boolean {
    if (!plan.lockedByDefault) {
      return false;
    }

    if (!plan.unlockAfter) {
      return true;
    }

    return !this.completedPlanKeys.includes(
      plan.unlockAfter
    );
  }

  get hasPlan(){
    return this.quickNav.storeData.get("my_plans")?.active || []
  }

  isActive(plan: any): boolean {

    return this.activePlanKeys?.includes(plan.id)
  }

  isCompleted(plan: any): boolean {
    return this.completedPlanKeys.includes(
      plan.key
    );
  }

  getUnlockPlanName(plan: any): string {
    const requiredPlan = this.plans.find(
      (item:any) => item.key === plan.unlockAfter
    );

    return requiredPlan?.name ?? 'previous plan';
  }

  getMaximumPlanReward(plan: any): number {
    return (
      plan.dailyReward *
      plan.durationDays
    );
  }

  selectPlan(plan: any): void {
    this.activationMessage = '';

    if (this.isLocked(plan)) {
      this.activationMessage =
        `Complete ${this.getUnlockPlanName(plan)} ` +
        `to unlock ${plan.name}.`;

      return;
    }

    if (this.isActive(plan)) {
      this.activationMessage =
        `${plan.name} is already active.`;

      return;
    }

    this.selectedPlan = plan;
  }

  closeConfirmation(): void {
    this.selectedPlan = null;
  }

  confirmActivation(): void {
    if (!this.selectedPlan) {
      return;
    }

    const plan = this.selectedPlan;

     let processor = 'create_plan'
     // if (this.hasPlan.length) {
     //   processor = "change_plan"
     // }
     this.quickNav.reqServerData.post('plans/', {plan_id:plan.id, processor})
     .subscribe((res:any)=>{
       this.closeConfirmation();
       if (res.status === 'success') {
         this.scrollToTop();
         this.loadData();
         this.quickNav.go("plan/activated")
       }
     })

  }

  formatMoney(amount: number): string {

    if (!amount) {
      amount=0
    }
    return amount.toLocaleString(
    'en-US',
    {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }
  );
  }

  getActivationtext(plan:any){

    let text = `Activate ${plan.name}`
    // if (this.hasPlan.length) text = `Change to ${plan.name}`;
    return text;

  }

  scrollToTop(): void {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  openTaskHistory(){
    this.quickNav.go('/task/history')
  }



}
