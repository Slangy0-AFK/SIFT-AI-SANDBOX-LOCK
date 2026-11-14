/** @param {{ children?: import('react').ReactNode, requiredPlan?: string, featureName?: string }} props */
export default function FeatureGate({ children }) {
  // STRICTLY BETA MODE: Grant access to all features
  return children;
}