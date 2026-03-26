import { Link } from "expo-router";
import { Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Home(){
return(
    <SafeAreaView className=" flex w-full h-full p-3">
        <Text className="font-bold text-3xl">SpeedLine</Text>
          <View className=' p-3 '>
              <TextInput
                className="bg-gray-200 rounded-full p-4"
                placeholder="Search Here ..."
                placeholderTextColor="#666666"
                secureTextEntry={true}
                
              />
              </View>
              <View>
                {/*
                Contacts and chat
                */}
              </View>
              <View className="bg-yellow-500 rounded-full w-[80px] h-[80px] items-center justify-center absolute bottom-20 right-10 mb-10 ">
                <Link href={"/(tabs)/chatscreen"}>
                    <Text className="text-7xl text-white font-bold p-2">+</Text>
                </Link>
                
              </View>
    </SafeAreaView>
)
}