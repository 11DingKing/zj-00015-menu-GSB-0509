export interface ABACAttribute {
  subject: Record<string, any>;
  resource: Record<string, any>;
  action: string;
  environment: Record<string, any>;
};

export interface ABACPolicy {
  id: string;
  expression: string;
  effect: 'allow' | 'deny';
};

export function parseExpression(expression: string): (attrs: ABACAttribute) => boolean {
  return (attrs: ABACAttribute) => {
    try {
      const { subject, resource, action, environment } = attrs;
      
      const evalFn = new Function(
        'subject',
        'resource',
        'action',
        'environment',
        `return ${expression};`
      );
      
      return !!evalFn(subject, resource, action, environment);
    } catch (error) {
      console.error('ABAC expression evaluation error:', error);
      return false;
    }
  };
}

export function evaluatePolicy(policy: ABACPolicy, attrs: ABACAttribute): boolean {
  const evaluator = parseExpression(policy.expression);
  const result = evaluator(attrs);
  return policy.effect === 'allow' ? result : !result;
}

export function evaluatePolicies(policies: ABACPolicy[], attrs: ABACAttribute): boolean {
  for (const policy of policies) {
    const result = evaluatePolicy(policy, attrs);
    if (policy.effect === 'deny' && result) {
      return false;
    }
    if (policy.effect === 'allow' && result) {
      return true;
    }
  }
  return false;
}

export function matchAttribute(subjectAttr: any, resourceAttr: any, operator: string): boolean {
  switch (operator) {
    case 'equals':
      return subjectAttr === resourceAttr;
    case 'not_equals':
      return subjectAttr !== resourceAttr;
    case 'contains':
      if (Array.isArray(subjectAttr)) {
        return subjectAttr.includes(resourceAttr);
      }
      if (typeof subjectAttr === 'string') {
        return subjectAttr.includes(resourceAttr);
      }
      return false;
    case 'in':
      if (Array.isArray(resourceAttr)) {
        return resourceAttr.includes(subjectAttr);
      }
      return false;
    case 'greater_than':
      return subjectAttr > resourceAttr;
    case 'less_than':
      return subjectAttr < resourceAttr;
    case 'greater_than_or_equal':
      return subjectAttr >= resourceAttr;
    case 'less_than_or_equal':
      return subjectAttr <= resourceAttr;
    default:
      return false;
  }
}

export function buildConditionFromRule(rule: any): (attrs: ABACAttribute) => boolean {
  return (attrs: ABACAttribute) => {
    const { subject, resource } = attrs;
    const subjectValue = subject[rule.subjectAttribute];
    const resourceValue = resource[rule.resourceAttribute];
    return matchAttribute(subjectValue, resourceValue, rule.operator);
  };
}
