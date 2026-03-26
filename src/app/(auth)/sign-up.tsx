
import { Link } from 'expo-router'
import React from 'react'
import { Image, Pressable, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function Page() {
  return (
    <SafeAreaView className='h-full w-full items-center justify-center  bg-yellow-500 ' >
        <View className='flex rounded-3xl bg-white  pl-7 pr-7 pb-7' >
            <View className='flex items-center justify-center'>
               <Image source={require('../../../assets/images/icon.png')} className='w-60 h-40' resizeMode='stretch' />
                <Text className='text-4xl font-bold text-yellow-500 pb-7'>Sign up</Text>
            </View>
      <Text className='font-semibold'>Email address</Text>
      <View className=' p-2 '>
      <TextInput
       className="border border-gray-300 rounded-lg p-4"
        autoCapitalize="none"
        
        placeholder="Enter email"
        placeholderTextColor="#666666"
        keyboardType="email-address"
      />
      </View>
      
      <Text className='font-semibold'>Password</Text>
      <View className=' p-2 '>
      <TextInput
       className="border border-gray-300 rounded-lg p-4"
        
        placeholder="Enter password"
        placeholderTextColor="#666666"
        secureTextEntry={true}
        
      />
        </View>
      
      <Pressable
        onPress={() => {}}
      >
        <View className='rounded-3xl bg-black p-4 items-center justify-center'>
            <Text className=' text-white font-semibold text-2xl '>Sign up</Text>
        </View>
      </Pressable>

      {/*{errors && <Text>{JSON.stringify(errors, null, 2)}</Text>}*/}

      <View className='items-center justify-center p-4'>
        <Text className='text-xl font-semibold'> Already have an account? </Text>
        <Link href="/(tabs)/home">
        <View>
            <Text className='text-yellow-500 font-bold text-xl' >Sign in</Text>
        </View>
        </Link>
      </View>

      <View nativeID="clerk-captcha" />
      </View>
    </SafeAreaView>
  )
}