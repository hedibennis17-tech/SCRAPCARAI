
import type { Assessment, ValuationResult } from "@/types";

const VALUATION_CONFIG = {
    "vehicle_weight_database": {
      "Sedan": {"min": 2800, "max": 3500, "avg": 3150},
      "SUV": {"min": 3500, "max": 5500, "avg": 4500},
      "Pickup": {"min": 4000, "max": 6500, "avg": 5250},
      "Van": {"min": 3800, "max": 5000, "avg": 4400},
      "Sport": {"min": 2600, "max": 3800, "avg": 3200},
      "Hatchback": {"min": 2400, "max": 3200, "avg": 2800},
      "Default": {"min": 3000, "max": 5000, "avg": 4000}
    },
    
    "metal_price_per_lb": 0.10,
    
    "vehicle_classes": {
      "E": {
        "brands": ["Kia", "Hyundai", "Toyota", "Honda", "Mazda"],
        "bonus_multiplier": 1.3,
        "description": "Haute demande - Pièces recherchées"
      },
      "P": {
        "brands": ["Ford", "Chevrolet", "Nissan", "Dodge", "Jeep"],
        "bonus_multiplier": 1.0,
        "description": "Demande standard"
      },
      "XT": {
        "brands": ["BMW", "Mercedes-Benz", "Audi", "Volkswagen", "Volvo"],
        "bonus_multiplier": 1.4,
        "description": "Export - Prix supérieur"
      }
    },
    
    "parts_value": {
      "catalytic_converter": {
        "present": 25,
        "missing": 0
      },
      "engine": {
        "good": 75,
        "runs_poorly": 30,
        "missing": 0
      },
      "transmission": {
        "good": 50,
        "issue": 15,
        "missing": 0
      },
      "battery": 10,
      "ac": 10,
      "wheels": {
        "present": 30,
        "missing": 0
      }
    },
    
    "condition_penalties": {
      "rust": -100,
      "accident": -150,
      "mechanical_issues": -75,
      "body_damage": -50
    },
    
    "complete_vehicle_bonus": {
      "bonus": 50
    }
};

type VehicleBodyType = keyof typeof VALUATION_CONFIG.vehicle_weight_database;


export const calculateValuation = (data: Assessment): ValuationResult => {
    const { vehicle, condition } = data;

    if (!vehicle?.make || !vehicle?.year || !vehicle?.vehicleType || !condition) {
        throw new Error("Incomplete vehicle data provided for valuation.");
    }
    
    // 1. Base metal value
    const bodyType = VALUATION_CONFIG.vehicle_weight_database[vehicle.vehicleType as VehicleBodyType] ? (vehicle.vehicleType as VehicleBodyType) : 'Default';
    const vehicleWeight = VALUATION_CONFIG.vehicle_weight_database[bodyType].avg;
    const metalValue = (vehicleWeight * VALUATION_CONFIG.metal_price_per_lb) * 0.5;
    
    // 2. Parts Value
    let partsValue = 0;
    const { runs, missingParts = [], hasMechanicalIssues } = condition;
    
    partsValue += missingParts.includes('Engine') ? 0 : (runs ? VALUATION_CONFIG.parts_value.engine.good : VALUATION_CONFIG.parts_value.engine.runs_poorly);
    partsValue += missingParts.includes('Transmission') ? 0 : (hasMechanicalIssues ? VALUATION_CONFIG.parts_value.transmission.issue : VALUATION_CONFIG.parts_value.transmission.good);
    partsValue += missingParts.includes('Catalyst') ? 0 : VALUATION_CONFIG.parts_value.catalytic_converter.present;
    partsValue += missingParts.includes('Battery') ? 0 : VALUATION_CONFIG.parts_value.battery;
    partsValue += missingParts.includes('AC') ? 0 : VALUATION_CONFIG.parts_value.ac;
    partsValue += missingParts.includes('Wheels') ? 0 : VALUATION_CONFIG.parts_value.wheels.present;

    // 3. Class Bonus
    const vehicleClassKey = Object.keys(VALUATION_CONFIG.vehicle_classes).find(key => 
        VALUATION_CONFIG.vehicle_classes[key as keyof typeof VALUATION_CONFIG.vehicle_classes].brands.includes(vehicle!.make!)
    ) as keyof typeof VALUATION_CONFIG.vehicle_classes | undefined;
    
    const classMultiplier = vehicleClassKey ? VALUATION_CONFIG.vehicle_classes[vehicleClassKey].bonus_multiplier : 1.0;
    const classBonus = (metalValue + partsValue) * (classMultiplier - 1.0);

    // 4. Condition Penalties
    let penalties = 0;
    if (condition.hasRust) penalties += VALUATION_CONFIG.condition_penalties.rust;
    if (condition.accident) penalties += VALUATION_CONFIG.condition_penalties.accident;
    if (condition.hasMechanicalIssues) penalties += VALUATION_CONFIG.condition_penalties.mechanical_issues;
    if (condition.hasBodyDamage) penalties += VALUATION_CONFIG.condition_penalties.body_damage;

    // 5. Completeness Bonus
    const isComplete = condition.isComplete && runs && !hasMechanicalIssues && (!missingParts || missingParts.length === 0);
    const completeBonus = isComplete ? VALUATION_CONFIG.complete_vehicle_bonus.bonus : 0;
    
    // 6. Final Calculation
    const total = metalValue + partsValue + classBonus + completeBonus + penalties;
    const finalPrice = Math.max(100, Math.round(total / 5) * 5); // Round to nearest 5

    return {
        finalPrice,
        breakdown: {
            metalValue: Math.round(metalValue),
            partsValue: Math.round(partsValue),
            classBonus: Math.round(classBonus),
            penalties: Math.round(penalties),
            completeBonus: Math.round(completeBonus),
        }
    };
};
