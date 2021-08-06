---
emoji: 🧩
title: 보다 안전한 getter, setter 만들기
date: '2021-08-03 10:00:00'
author: Baek2back
tags: 불변성 immutability getter setter
categories: 자바스크립트
---

다음 코드의 결과는 무엇인지 확인해보자.

```javascript
const arr = [1, 2];
arr[0]; // 1

someFunction(arr);
```

그렇다면 코드가 다음과 같이 수정되었을때 `arr`라는 배열의 첫 번째 요소는 이전과 동일하게 1일까?

```javascript{4}
const arr = [1, 2];
someFunction(arr);

arr[0] === 1; // ?
```

이는 `someFunction`의 구현에 따라 달라진다. 만약 `someFunction`의 구현이 다음과 같다면 배열의 첫 번째 요소는 4가 될 것이다.

```javascript
const someFunction = (argument) => {
  argument[0] = 4;
};

someFunction(arr);

arr[0]; // 4
```

즉, 이는 코드의 순서에 따라 다른 결과를 만들어내게 된 상황인데, 이러한 현상이 발생하는 원인은 인수로 전달한 값이 "배열"이라는 객체 타입의 값이므로 해당 배열을 가리키는 참조 값이 복사되어 전달되었기 때문이다.

```javascript{4}
const arr = [1, 2];

const someFunction = (argument) => {
  console.log(arr === argument); // true
  argument[0] = 4;
};
```

```javascript
[ argument ] ⤵
     ↑        [ 1, 2, 3 ]
 [  arr  ]   ⤴


[ argument ] ⤵
     ↑        [ 1 → 4, 2, 3 ]
 [  arr  ]   ⤴


 [  arr  ]  → [ 4, 2, 3 ]
```

물론 이처럼 짧은 코드에서는 원본이 변경되지 않도록 코드의 순서에 유념해서 문(statement)들을 배치할 수 있을 것이다. 하지만 만약 해당 코드가 매우 복잡한 비즈니스 로직 내부에 위치한 상황이라면 한 눈에 문제를 식별하기 어려울 뿐만 아니라 코드의 순서에 의해 다른 코드 역시 영향을 받게 되는 상황이 발생할 수 있다. 따라서 `someFunction`이 인수로 전달받은 원본 배열에 영향을 주지 않도록 만들어 코드의 순서에 영향을 받지 않게끔 하는 것이 가장 좋은 해결책일 것이다. 그러기 위해서는 우선 사본을 먼저 만들고 사본에 대한 조작을 수행한 뒤에 사본을 반환하는 방식이 가능할 것이다.

```javascript
[   copy   ] → [ 1 → 4, 2, 3 ]

[ arr ] → [ 1, 2, 3 ]
↳  [ argument ] ⤴
```

그 전에 간단한 코드를 한 번 살펴보자. 다음 코드의 출력은 무엇일까?

```javascript
[1, 2, 3] === [1, 2, 3]; // (?)
```

정답은 `false`다. 그 이유는 배열 리터럴이 평가되면 새로운 배열 객체가 메모리 공간에 생성되기 때문에 두 배열 객체는 다른 메모리 공간에 위치하므로 서로 다른 주소 값을 갖게 된다. 따라서 사본을 만들때의 전략은 새로운 배열 객체를 메모리 상에 만들고, 원본 배열의 요소를 복사하는 방식으로 수행하면 될 것이다. 이때 **shallow copy**를 수행하는 `Array.prototype.slice`를 사용하면 쉽게 사본을 생성할 수 있다.

> 참조 값을 통한 동등 비교를 수행하는 대신 값을 기준으로 두 객체의 동등 비교를 수행하는 방식에 대해서는 **집합 구현하기**라는 포스트를 작성할 예정이다.

```javascript{2}
const arr = [1, 2, 3];


const someFunction = (argument) => {
  let copyArgument = argument.slice();
  // or            = [...argument];
  copyArgument[0] = 4;
  return copyArgument;
};

someFunction(arr); // [4, 2, 3]
arr;               // [1, 2, 3]
```

특정 객체에 대한 조작이 필요할 때 해당 객체의 사본을 만들어, 이를 수정한 뒤 반환하는 방식을 **copy-on-write**라 하며 배열의 요소가 원시값(primitive)으로만 구성된 경우에는 충분히 불변성을 지키면서 갱신을 수행할 수 있다. 하지만 요소가 객체 타입의 값인 경우에는 어떻게 될까?

## Structural sharing

앞서 살펴본 `copy-on-write` 전략을 객체 타입의 값을 요소로 갖는 배열에 적용해보자.

```javascript{5}
const arr = [{ a: 1 }, { b: 2 }, { c: 3 }];

const copyOnWriteToArgument = (argument) => {
  let copyArgument = argument.slice();
  console.log(copyArgument === arr); // false
  copyArgument[0].a = 4;
  return copyArgument;
};

copyOnWriteToArgument(arr);
arr; // [{ a: 4}, { b: 2 }, { c: 3}]
```

안타깝게도 원본 배열이 수정된 것을 확인할 수 있다. 이러한 현상이 일어나는 이유는 배열 객체는 메모리 상에 새로 생성되었다 하더라도 두 배열의 각 요소가 가리키는 참조값이 동일(**동일한 객체를 참조**)하기 때문에 발생한다. 이를 **Structural sharing**이라 한다.

```javascript
[ arr ] → [ argument  ]              [ copy  ]
          (argument[0]) → { a: 1 } ← (copy[0])
          (argument[1]) → { b: 2 } ← (copy[1])
          (argument[2]) → { c: 3 } ← (copy[2])

copy[0].a = 4;

[ arr ] → [ argument  ]              [ copy  ]
          (argument[0]) → { a: 4 } ← (copy[0])
          (argument[1]) → { b: 2 } ← (copy[1])
          (argument[2]) → { c: 3 } ← (copy[2])
```

이 경우 `argument`와 `copy`가 동일한 객체를 공유하기 때문에 어느 한쪽에서 변경이 발생하면 다른 쪽이 영향을 받게 되는 것이다. 따라서 새로운 객체를 메모리 상에 생성하고 `copy[0]`이 `argument[0]`과 동일한 객체가 아닌 새로 생성된 객체를 가리키게끔 하면 더 이상 동일한 객체를 공유하지 않게 된다.

```javascript{3}
const copyOnWriteToArgument = (argument) => {
  let copyArgument = argument.slice();
  copyArgument[0] = { a: 4 };
  return copyArgument;
};
```

```javascript
[ arr ] → [ argument  ]              [ copy  ]
          (argument[0]) → { a: 1 } ← (copy[0])
          (argument[1]) → { b: 2 } ← (copy[1])
          (argument[2]) → { c: 3 } ← (copy[2])

copy[0] = { a: 4 };

[ arr ] → [ argument  ]              [ copy  ]
          (argument[0]) → { a: 1 }   (copy[0]) → { a: 4 }
          (argument[1]) → { b: 2 } ← (copy[1])
          (argument[2]) → { c: 3 } ← (copy[2])
```

하지만 이렇게 수동으로 새로운 객체에 대한 참조로 재할당을 시켜주는 작업은 실수를 유발하기 쉽고, 객체의 구조에 종속적이라는 한계가 존재한다. 이러한 단점은 중첩된 객체에 대해 작업을 수행할 때 더욱 도드라지는데 대표적인 사례로는 `redux`에서 중첩된 상태 객체를 처리하는 `reducer`를 생각하면 된다.

```javascript
function reducer(state = initialState, action) {
  switch (action.type) {
    case SOME_ACTION:
      return {
        ...state,
        a: {
          ...state.a,
          b: {
            ...state.a.b,
            c: action.payload,
          },
        },
      };
    // ...
  }
}
```

이때 객체 타입의 값에 대해서도 얕은 복사(**shallow copy**) 대신 깊은 복사(**deep copy**)를 수행한 뒤 작업하게 된다면 원본 객체에 대한 영향을 고려하지 않고 훨씬 더 편하게 작업할 수 있을 것이다. 이때 깊은 복사를 수행하는 가장 간단한 방법 중 하나는 바로 `JSON.stringify`와 `JSON.parse`를 사용하는 방식이다.

```javascript
const jsonCopy = (obj) => JSON.parse(JSON.stringify(obj));
```

다만 `JSON.stringify`는 `enumerable`이 `true`인 프로퍼티에 대해서만 수행되는데, `new` 키워드와 함께 인스턴스화 된 객체라 하더라도 `constructor` 프로퍼티는 `enumerable`이 `false`이므로 `JSON.parse`를 통해 다시 객체화하였을 때 `constructor`를 호출할 수 없게 된다.

```javascript
new Date() instanceof Date; // true
typeof new Date(); // "object"

jsonCopy(new Date()) instanceof Date; // false
typeof jsonCopy(new Date()); // "string"
```

따라서 재귀를 사용하여 원시값의 경우에는 불변하므로 그대로 반환하고, 객체 타입의 값에 대해서는 `constructor`를 호출하게끔 하면 깊은 복사가 이루어진 객체에 대한 사본을 얻을 수 있을 것이다.

```javascript
const deepCopy = (obj) => {
  let aux = obj;
  if (obj !== null && typeof obj === 'object') {
    aux = new obj.constructor();
    Object.keys(obj).forEach((key) => {
      aux[key] = deepCopy(obj[key]);
    });
  }
  return aux;
};

deepCopy(new Date()) instanceof Date; // true
```

하지만 한 가지 더 고려해야 할 사항이 남아있는데, 이는 바로 `copy-on-write`의 결과로 반환된 사본은 불변하게 동작한다는 것을 보장할 수 없다는 것이다.

```javascript
const obj = {
  a: {
    b: 1,
  },
};

const getA = (obj) => obj.a;

const objA = getA(obj);

obj; // { a: { b: 1 }}
objA.b = 2;
obj; // { a: { b: 2 }}
```

`obj`를 `copy-on-write`의 결과로 반환된 원본 객체에 대한 사본이라 가정하면, `obj.a`와 `objA`이 가리키고 있는 값은 동일한 `{ b: 1 }` 객체이다. 따라서 공유 객체에 대해 직접 조작을 수행하게 되면 변경 사항이 양쪽 모두에 반영된다. 따라서 이러한 동작을 막기 위해서는 `copy-on-write`가 반환하는 객체 자체에 `Object.freeze`를 적용하여 `writable` 프로퍼티 어트리뷰트를 `false`로 설정하면 된다.

```javascript
Object.freeze(obj.a);

const objA = getA(obj);

objA.b = 2;
// TypeError: Cannot assign to read only property "b" of object "#<Object>"
```

다만, `Object.freeze`는 얕은 동결(**shallow freeze**)만을 수행하므로 특정 객체를 불변 객체로 만드려면 재귀를 사용하여 깊은 동결(**deep freeze**)를 적용하여야 한다.

> 이때 프로토타입 체인을 통해 상속받은 프로퍼티에 대해서는 동결하지 않아야 한다.

```javascript
const deepFreeze = (obj) => {
  Object.keys(obj).forEach((prop) => {
    if (
      obj[prop] !== null &&
      (typeof obj[prop] === 'object' || typeof obj[prop] === 'function') &&
      !Object.isFrozen(obj[prop])
    )
      deepFreeze(obj[prop]);
  });
  return Object.freeze(obj);
};
```

따라서 지금까지의 내용을 바탕으로 `setter`가 수행해야 할 동작을 간략하게 정의해보면 다음과 같다.

```javascript
const setter = (obj) => {
  // 1. 인수로 제공된 객체에 대한 deepCopy를 수행한다.
  const newObj = deepCopy(obj);
  // 2. deepCopy의 결과로 반환된 객체에 대한 조작을 수행한다.
  // ...
  // 3. deepFreeze를 수행한 후 반환한다.
  return deepFreeze(newObj);
};
```

## setter

단순하게 키와 값을 전달받아 객체를 수정하는 함수는 다음과 같이 구현할 수 있을 것이다.

```javascript
const setValue = (key, value) => (obj) => (obj[key] = value);
```

하지만 이 함수만으로는 중첩된 프로퍼티를 수정하는 것은 불가능하다. 따라서 중첩된 프로퍼티에 대해서도 정상적으로 동작할 수 있게끔 함수의 시그니쳐를 수정해보자.

```javascript
const setByPath = (paths, value) => (obj) => { ... };
```

이제 참조를 수행할 프로퍼티에 대한 경로를 전달받게 되므로 이를 통해 재귀적으로 객체를 순회하면서 만약 존재하지 않는 프로퍼티라면 추가하고 경로의 끝에 도달하면 주어진 값을 해당 위치에 할당하고 종료하는 함수를 만들어볼 수 있을 것이다. 경로를 따라 순회하다가 객체 타입의 값이 아닌 원시 값의 경우에는 프로퍼티를 가질 수 없으므로 참조 혹은 갱신을 중단하고 그대로 반환한다. 이를 통해 원시값의 프로퍼티를 참조하려는 시도는 무시된다.

```javascript
const isPrimitive = (value) =>
  value === null || (typeof value !== 'object' && typeof value !== 'function');
```

```javascript
const setByPath = (paths, value) => (obj) => {
  if (isPrimitive(obj)) {
    return obj;
  }
  if (!(paths[0] in obj)) {
    obj[paths[0]] = paths.length === 1 ? null : Number.isInteger(paths[1]) ? [] : {};
  }

  if (paths.length > 1) {
    return setByPath(paths.slice(1), value)(obj[paths[0]]);
  } else {
    obj[paths[0]] = value;
    return obj;
  }
};
```

이제 최종적인 `setter` 구현을 마무리하고 테스트해보자.

```javascript{3}
const setter = (paths, value, obj) => {
  const newObj = deepCopy(obj);
  setByPath(paths, value)(newObj);
  return deepFreeze(newObj);
};

const obj = {
  a: 1,
  b: 2,
  c: {
    d: "d",
    e: {
      f: 3,
    },
  },
};

const newObj1 = setter(["a"], 2, obj);
newObj1;
// { a: 2, b: 2, c: { d: "d", e: { f: 3 } } }

const newObj2 = setter(["c", "g"], 4, obj);
newObj2;
// { a: 1, b: 2, c: { d: "d", e: { f: 3 }, g: 4 } }

const newObj3 = setter(["c", "e", "f"], 5, obj);
newObj3;
// { a: 1, b: 2, c: { d: "d", e: { f: 5 } } }

obj;
// { a: 1, b: 2, c: { d: "d", e: { f: 3 } } }
```

## getter

그렇다면 `setter`에 이어 `getter`도 만들어보자. 우선은 단순하게 객체에서 특정 프로퍼티의 값을 얻을 수 있는 함수이다.

```javascript
const getField = (key) => (obj) => obj[key];
const obj = {
  a: {
    b: 1,
  },
};
getField('a')(obj); // { b: 1 }

getField(?)(obj); // obj.a.b
```

하지만 `setter`에서도 살펴보았듯이 이 함수만으로는 중첩된 프로퍼티 참조는 불가한 상황이다. 따라서 프로퍼티를 참조를 수행할 경로를 넘겨주는 방식으로 함수 시그니처를 변경해보자.

```javascript
const getter = (paths) => (obj) => { ... };
```

이때 중요한 점은 만약 존재하지 않는 프로퍼티에 대해 참조를 수행하는 경우 `undefined`를 반환해야 한다는 점이다.

```javascript
obj.a.c; // undefined

obj.a.c.d;
// TypeError: Cannot read property "d" of undefined
```

자바스크립트의 경우 존재하지 않는 프로퍼티를 참조하면 `undefined`를 반환해준다(원시값의 경우 래퍼 객체를 참조). 하지만 `null`과 `undefined`의 경우에는 프로퍼티 참조를 수행하면 `undefined`를 반환해주는 것이 아니라 `TypeError`를 발생시킨다.

```javascript
obj && obj.a && obj.a.c && obj.a.c.d; // undefined

// Optional Chaining
obj.a?.c?.d; // undefined
```

특히 Optional한 프로퍼티에 대한 참조를 수행할 때 `TypeError`가 발생하는 것을 막기 위해 일반적으로는 단락 평가나 옵셔널 체이닝 연산자를 사용하는 형태로 예외처리를 수행할 것이다. 하지만 이 두 방법 모두 한계가 존재하는데, 우선 단락 평가의 경우 이전의 값이 `null`이나 `undefined`인 경우 이외에도 falsy(`0`, `""` 등)한 값인 경우라면 의도대로 동작하지 않을 것이다. 또한 옵셔널 체이닝의 경우에는 기본적으로 연산자이기 때문에 변수에 할당하는 것은 불가능하다. 따라서 해당 로직을 재사용하는 것이 불가능하기 때문에 특정 객체의 구조가 변경된다면 일일히 수정해주어야 한다는 한계가 있다.

```javascript
const getter = (paths) => (obj) => {
  if (isPrimitive(obj)) {
    return obj;
  }

  if (paths[0] in obj) {
    return paths.length > 1
      ? getter(paths.slice(1))(obj[paths[0]])
      : deepFreeze(deepCopy(obj[paths[0]]));
  } else {
    return undefined;
  }
};

const obj = {
  a: 1,
  b: 2,
  c: {
    d: {
      e: 3,
    },
  },
};
deepFreeze(obj);

getter(['c'])(obj);
// { d: { e: 3 } }
getter(['b', 1])(obj);
// 2
getter(['o', 'c'])(obj);
// undefined
```

`getter`의 경우에는 대상 객체의 구조가 변경되더라도 전달하는 경로 배열만 수정해주면 되므로 보다 유연하게 사용할 수 있다.

```javascript
const obj = {
  a: 1,
  b: 2,
  c: {
    d: {
      e: 3,
    },
  },
};
deepFreeze(obj);

Object.isFrozen(obj); // true

Object.isFrozen(getter(['c'])(obj)); // true

getter(['c'])(obj).d = 2;
// TypeError: Cannot assign to read only property "d" of object "#<Object>"

obj.c === getter(['c'])(obj); // false
```

## 결론

- 모든 객체 조작에 대해 불변성을 준수한다는 것은 상태를 추적하는 것을 용이하게 만든다는 장점만큼이나, 모든 조작에 대해 객체의 사본을 생성하고 다시 동결을 수행하는만큼 효율성 측면에서는 변이(Mutation)을 허용하는 방식에 비해 떨어질 수 있다고 생각된다.

- 현실적으로는 이미 존재하는 객체에 대해서 메모리 상에 다시 생성하지 않는 Structural sharing 전략이 활용될 수 밖에 없다고 생각한다. 다만 객체를 공유하는 스코프를 가급적 좁게 만들고 외부의 개입이 불가능하도록 통제가능한 영역 내에서만 Mutator를 사용한다면 효율성을 확보할 수 있을 것이다.
