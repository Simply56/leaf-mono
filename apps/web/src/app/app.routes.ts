import { Routes } from '@angular/router';
import { PlantsOverview } from './components/plants-overview/plants-overview';
import { PlantDetails } from './components/plant-details/plant-details';

export const routes: Routes = [
    {
        path: '',
        component: PlantsOverview,
    },
    {
        path: 'plant/:id',
        component: PlantDetails,
    },
];
