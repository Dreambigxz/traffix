import { Routes } from '@angular/router';
import { authGuard } from './reuseables/auth/auth.guard';
import { AuthComponent } from "./auth/auth.component";

import { MainComponent } from "./main/main.component";
import { DetailsComponent } from "./articles/details/details.component";

import { CreatePlanComponent } from "./plan/create/create.component";
import {  SponsoredAdsComponent } from "./sponsored-ads/sponsored-ads.component";
import { HistoryComponent } from "./plan/history/history.component";
import { ActivatedComponent } from "./plan/activated/activated.component";

import { DepositComponent } from "./wallet/deposit/deposit.component";
import { WithdrawComponent } from "./wallet/withdraw/withdraw.component";
import { TransactionsComponent } from "./wallet/transactions/transactions.component";

import { InvitesComponent } from "./invites/invites.component";
import { UsersComponent } from "./invites/users/users.component";
import { PendingComponent } from "./invites/pending/pending.component";
import { RewardComponent } from "./invites/reward/reward.component";

import { AccountComponent } from "./account/account.component";
import { SecurityCenterComponent } from "./account/security-center/security-center.component";

import { AgentManagementComponent } from "./admin/agent-management/agent-management.component";
import {PaymentConfirmationComponent} from './admin/payment-confirmation/payment-confirmation.component'
import { NotificationsComponent } from "./notifications/notifications.component";

import { EngagementHistoryComponent } from "./articles/engagement-history/engagement-history.component";
export const routes: Routes = [

  // auth
  {
      path: 'authentication',
      component: AuthComponent,
      title:"Authorization",
  },

  // main

  {
    path:"",
    component:  MainComponent,
    title: "Main",
    canActivate: [authGuard]

  },

  // news Details
  {
    path: 'article/:id',
      component: DetailsComponent,
      title:"Article details",
      canActivate: [authGuard]
  },

  // engagement history
  {
    path: 'engagement/history',
      component:EngagementHistoryComponent,
      title:"Engagement History",
      canActivate: [authGuard]
  },

  //activate plan
  {
    path:"plan/new",
    component: CreatePlanComponent,
    title:"Activate plan",
    canActivate: [authGuard]

  },
  {
    path:"plan/activated",
    component: ActivatedComponent,
    title:"Activate plan",
    canActivate: [authGuard]

  },
  {
    path:"task/history",
    component: HistoryComponent,
    canActivate: [authGuard]
  },

  {
    path:"ads",
    component: SponsoredAdsComponent,
    canActivate: [authGuard]
  },


  // wallet routes
  {
    path:"wallet/deposit",
    component: DepositComponent,
    canActivate: [authGuard]

  },
  {
    path:"wallet/withdraw",
    component: WithdrawComponent,
    canActivate: [authGuard]

  },
  {
    path:"wallet/transactions",
    component:  TransactionsComponent,
    title: "Transaction",
    canActivate: [authGuard]

  },

  // Referral Routes
  {
    path:"invites",
    component:  InvitesComponent,
    title: "Promotions",
    canActivate: [authGuard]

  },
  {
    path:"invites/users/:lv",
    component:  UsersComponent,
    title: "Invited Users",
    canActivate: [authGuard]

  },
  {
    path:"invites/inactives",
    component:  PendingComponent,
    title: "Pending Subordinates",
    canActivate: [authGuard]

  },


  {
    path:"account",
    component:  AccountComponent,
    title: "Account",
    canActivate: [authGuard]

  },

  {
    path:"account/security",
    component:  SecurityCenterComponent,
    title: "Security",
    canActivate: [authGuard]

  },

  // admin
  {
      path: 'admin-management',
      component: AgentManagementComponent,
      title: 'Agent-management',
      canActivate: [authGuard]

  },
    // payment confirmation paths
    {
      path: 'confirm',
      component: PaymentConfirmationComponent,
      title: 'Confirmation',
      canActivate: [authGuard]

    },

  // notification
  {
    path: 'notifications',
      component: NotificationsComponent,
      title:"Notification",
      canActivate: [authGuard]
  },


];
