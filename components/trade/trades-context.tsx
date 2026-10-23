'use client';
import {createContext,useContext} from 'react';
import {trades} from '../../lib/rules';

// Active trades as administration set them (GET /api/trades); the original list until they load.
export const TradesContext=createContext<string[]>(trades);
export const useTrades=()=>useContext(TradesContext);
